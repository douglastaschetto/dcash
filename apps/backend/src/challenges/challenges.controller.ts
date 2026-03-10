import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  UseGuards, 
  Request, 
  Query, 
  Param,
  UnauthorizedException 
} from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertChallengeDto } from './dto/upsert-challenge.dto';

@UseGuards(JwtAuthGuard)
@Controller('challenges')
export class ChallengesController {
  constructor(private readonly challengesService: ChallengesService) {}

  @Get()
  async findAll(@Request() req, @Query('year') year: string) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    const yearNumber = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.challengesService.findAll(userId, yearNumber);
  }

  @Post()
  async upsert(@Request() req, @Body() dto: UpsertChallengeDto) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Usuário não identificado.');
    }

    return this.challengesService.upsert(userId, dto);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const userId = req.user?.id || req.user?.userId || req.user?.sub;
    
    if (!userId) {
      throw new UnauthorizedException('Ação não permitida.');
    }

    // Passamos o userId para o service garantir que o desafio pertence à família/usuário
    return this.challengesService.delete(id, userId);
  }
}