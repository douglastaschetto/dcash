import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpsertChallengeDto } from './dto/upsert-challenge.dto';

@Injectable()
export class ChallengesService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, year: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    // Busca desafios do usuário ou da família
    const data = await (this.prisma.financialChallenge as any).findMany({
      where: { 
        year: Number(year),
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      orderBy: { month: 'asc' },
    });
    
    return data || [];
  }

  async upsert(userId: string, dto: UpsertChallengeDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const familyGroupId = user?.familyGroupId;
    const achieved = dto.status === "Concluída" ? "Realizado" : "Não realizado";
    const yearNumber = Number(dto.year);

    // 1. Tenta encontrar desafio existente para o mês/ano no contexto da família/usuário
    const existing = await (this.prisma.financialChallenge as any).findFirst({
      where: {
        month: dto.month,
        year: yearNumber,
        OR: [
          { familyGroupId: familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (existing) {
      // 2. Atualiza o existente
      return this.prisma.financialChallenge.update({
        where: { id: existing.id },
        data: { 
          challenge: dto.challenge,
          status: dto.status,
          achieved: achieved,
          observations: dto.observations || ""
        },
      });
    }

    // 3. Cria um novo vinculado à família
    return (this.prisma.financialChallenge as any).create({
      data: { 
        userId,
        familyGroupId,
        month: dto.month,
        year: yearNumber,
        challenge: dto.challenge,
        status: dto.status || "Não iniciada",
        achieved: achieved,
        observations: dto.observations || ""
      } as any,
    });
  }

  async delete(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    // Deleta apenas se for o dono ou da mesma família
    const result = await (this.prisma.financialChallenge as any).deleteMany({
      where: { 
        id,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Desafio não encontrado ou sem permissão.');
    }

    return result;
  }
}