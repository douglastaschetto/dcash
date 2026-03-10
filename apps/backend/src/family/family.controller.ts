// backend/src/family/family.controller.ts
import { 
  Controller, 
  Get,
  Post,
  Body,
  UseGuards, 
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // Verifique se este caminho está correto
import { PrismaService } from 'prisma/prisma.service';
import { FamilyService } from './family.service';
import { JoinFamilyDto } from './dto/join-family.dto';

@Controller('family')
@UseGuards(JwtAuthGuard)
export class FamilyController {
  constructor(
    private prisma: PrismaService,
    private familyService: FamilyService // Injete o service aqui
  ) {}
@Post('create')
  async create(@Request() req) {
    const userId = req.user.id || req.user.userId;
    return this.familyService.createGroup(userId);
  }

  @Post('join')
  async join(@Request() req, @Body() dto: JoinFamilyDto) {
    const userId = req.user.id || req.user.userId;
    return this.familyService.joinGroup(userId, dto.inviteCode);
  }

  @Get('members')
  async getMembers(@Request() req) {
    // O req.user é preenchido pelo JwtAuthGuard após validar o token
    const userId = req.user.id || req.user.userId; 

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    if (!user?.familyGroupId) {
      // Retorna o próprio usuário se não tiver grupo
      const me = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, avatar: true }
      });
      return [me];
    }

    return this.prisma.user.findMany({
      where: { familyGroupId: user.familyGroupId },
      select: { id: true, name: true, avatar: true },
      orderBy: { name: 'asc' }
    });
  }
}