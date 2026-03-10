import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Patch, 
  Body, 
  Param, 
  Delete, 
  UseGuards, 
  Request, 
  UnauthorizedException 
} from '@nestjs/common';
import { DreamsService } from './dreams.service';
import { CreateDreamDto } from './dto/create-dream.dto';
import { UpdateDreamDto } from './dto/update-dream.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dreams')
@UseGuards(JwtAuthGuard)
export class DreamsController {
  constructor(private readonly dreamsService: DreamsService) {}

  /**
   * Cria um novo sonho.
   */
  @Post()
  async create(@Request() req, @Body() createDreamDto: CreateDreamDto) {
    const userId = this.getUserId(req);
    return this.dreamsService.create(userId, createDreamDto);
  }

  /**
   * Retorna todos os sonhos do usuário e de sua família.
   */
  @Get()
  async findAll(@Request() req) {
    const userId = this.getUserId(req);
    return this.dreamsService.findAll(userId);
  }

  /**
   * ATUALIZAÇÃO COMPLETA: Resolve o erro de enviar o ID no Body.
   * Usamos 'as any' para desestruturar e remover o ID técnico antes de enviar ao Service.
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateDreamDto
  ) {
    const userId = this.getUserId(req);
    
    // IMPORTANTE: Remove o 'id' do corpo se o frontend enviou, 
    // evitando conflitos de Primary Key no Prisma.
    const { id: _, ...cleanData } = updateDto as any;
    
    return this.dreamsService.update(id, userId, cleanData);
  }

  /**
   * ATUALIZAÇÃO RÁPIDA: Apenas o saldo acumulado.
   */
  @Patch(':id/progress')
  async updateProgress(
    @Param('id') id: string,
    @Request() req,
    @Body('savedValue') savedValue: number
  ) {
    const userId = this.getUserId(req);
    return this.dreamsService.updateProgress(id, userId, savedValue);
  }

  /**
   * Exclui um sonho.
   */
  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req) {
    const userId = this.getUserId(req);
    return this.dreamsService.remove(id, userId);
  }

  /**
   * Helper centralizado para extração de UserID do Token JWT.
   */
  private getUserId(req: any): string {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Sessão inválida ou usuário não identificado.');
    }
    
    return userId;
  }
}