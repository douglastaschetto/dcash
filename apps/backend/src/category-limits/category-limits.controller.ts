import {
  Controller, Get, Post, Delete,
  Body, Param, Query, Request,
  UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { CategoryLimitsService } from './category-limits.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpsertCategoryLimitDto } from './dto/upsert-category-limit.dto';

@Controller('category-limits')
@UseGuards(JwtAuthGuard)
export class CategoryLimitsController {
  constructor(private readonly service: CategoryLimitsService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException();
    return id;
  }

  @Get('yearly-status')
  getYearlyStatus(@Query('year') year: string, @Request() req: any) {
    const y = Number(year) || new Date().getFullYear();
    return this.service.getYearlyStatus(this.uid(req), y);
  }

  @Get('historical')
  getHistorical(
    @Query('month') month: string,
    @Query('year') year: string,
    @Request() req: any,
  ) {
    const m = Number(month) || new Date().getMonth();
    const y = Number(year) || new Date().getFullYear();
    return this.service.getHistoricalSpending(this.uid(req), m, y);
  }

  @Get()
  findAll(
    @Query('month') month: string,
    @Query('year') year: string,
    @Request() req: any,
  ) {
    const m = Number(month) || new Date().getMonth() + 1;
    const y = Number(year) || new Date().getFullYear();
    return this.service.getDashboard(this.uid(req), m, y);
  }

  @Post()
  upsert(@Body() dto: UpsertCategoryLimitDto, @Request() req: any) {
    return this.service.upsertLimit(this.uid(req), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req: any) {
    return this.service.remove(id, this.uid(req));
  }
}
