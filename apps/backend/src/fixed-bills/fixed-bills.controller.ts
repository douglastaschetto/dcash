import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, Request, Query, UnauthorizedException,
} from '@nestjs/common';
import { FixedBillsService } from './fixed-bills.service';
import { CreateFixedBillDto } from './dto/create-fixed-bill.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('fixed-bills')
@UseGuards(JwtAuthGuard)
export class FixedBillsController {
  constructor(private readonly fixedBillsService: FixedBillsService) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Post()
  create(@Request() req, @Body() dto: CreateFixedBillDto) {
    return this.fixedBillsService.create(this.getUserId(req), dto);
  }

  @Get()
  findAll(
    @Request() req,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.fixedBillsService.findAll(
      this.getUserId(req),
      month ? Number(month) : undefined,
      year ? Number(year) : undefined,
    );
  }

  @Get('options')
  findAllSimple(@Request() req) {
    return this.fixedBillsService.findAllSimple(this.getUserId(req));
  }

  @Patch(':id')
  update(
    @Request() req,
    @Param('id') id: string,
    @Body() dto: Partial<CreateFixedBillDto>,
  ) {
    return this.fixedBillsService.update(this.getUserId(req), id, dto);
  }

  @Delete(':id')
  remove(@Request() req, @Param('id') id: string) {
    return this.fixedBillsService.remove(this.getUserId(req), id);
  }
}
