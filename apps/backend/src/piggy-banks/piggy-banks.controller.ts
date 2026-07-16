import {
  Controller, Get, Post, Patch, Delete,
  Param, Body, Req, UseGuards, UnauthorizedException,
} from '@nestjs/common';
import { PiggyBanksService } from './piggy-banks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('piggy-banks')
@UseGuards(JwtAuthGuard)
export class PiggyBanksController {
  constructor(private readonly service: PiggyBanksService) {}

  private uid(req: any): string {
    const id = req.user?.id;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Get()
  findAll(@Req() req) {
    return this.service.getDashboard(this.uid(req));
  }

  @Post()
  create(@Body() dto: any, @Req() req) {
    return this.service.create(this.uid(req), dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: any, @Req() req) {
    return this.service.update(id, this.uid(req), dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req) {
    return this.service.remove(id, this.uid(req));
  }

  @Post(':id/deposit')
  deposit(@Param('id') id: string, @Body() body: { amount: number }, @Req() req) {
    return this.service.deposit(id, this.uid(req), body.amount);
  }

  @Post(':id/withdraw')
  withdraw(@Param('id') id: string, @Body() body: { amount: number }, @Req() req) {
    return this.service.withdraw(id, this.uid(req), body.amount);
  }
}
