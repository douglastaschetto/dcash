import { 
  Controller, Get, UseGuards, Req, Post, Patch, 
  Delete, Param, Body, UnauthorizedException 
} from '@nestjs/common';
import { PiggyBanksService } from './piggy-banks.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('piggy-banks')
@UseGuards(JwtAuthGuard)
export class PiggyBanksController {
  constructor(private readonly piggyBanksService: PiggyBanksService) {}

  /**
   * Extração centralizada do ID do usuário do token JWT.
   * Tenta encontrar em múltiplas chaves comuns (id, userId, sub).
   */
  private getUserId(req: any): string {
    const id = req.user?.id || req.user?.userId || req.user?.sub;
    if (!id) throw new UnauthorizedException('Usuário não identificado.');
    return id;
  }

  @Get()
  async findAll(@Req() req) {
    const userId = this.getUserId(req);
    const dashboard = await this.piggyBanksService.getDashboard(userId);
    return dashboard || []; // Garante retorno de array para o Frontend
  }

  @Post()
  async create(@Body() createDto: any, @Req() req) {
    const userId = this.getUserId(req);
    return this.piggyBanksService.create({
      ...createDto,
      userId,
    });
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() data: any, @Req() req) {
    const userId = this.getUserId(req);
    return this.piggyBanksService.update(id, userId, data);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const userId = this.getUserId(req);
    return this.piggyBanksService.remove(id, userId);
  }
}