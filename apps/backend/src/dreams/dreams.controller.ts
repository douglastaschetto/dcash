import {
  Controller, Get, Post, Put, Patch, Delete,
  Body, Param, UseGuards, Request, UnauthorizedException,
} from '@nestjs/common';
import { DreamsService } from './dreams.service';
import { CreateDreamDto } from './dto/create-dream.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('dreams')
@UseGuards(JwtAuthGuard)
export class DreamsController {
  constructor(private readonly dreamsService: DreamsService) {}

  private getUserId(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Sessão inválida.');
    return id;
  }

  @Post()
  create(@Request() req, @Body() dto: CreateDreamDto) {
    return this.dreamsService.create(this.getUserId(req), dto);
  }

  @Get()
  findAll(@Request() req) {
    return this.dreamsService.findAll(this.getUserId(req));
  }

  @Put(':id')
  update(@Param('id') id: string, @Request() req, @Body() dto: UpdateDreamDto) {
    const { id: _ignored, ...clean } = dto as any;
    return this.dreamsService.update(id, this.getUserId(req), clean);
  }

  @Patch(':id/progress')
  updateProgress(
    @Param('id') id: string,
    @Request() req,
    @Body('savedValue') savedValue: number,
  ) {
    return this.dreamsService.updateProgress(id, this.getUserId(req), savedValue);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.dreamsService.remove(id, this.getUserId(req));
  }
}
