import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class PiggyBanksService {
  constructor(private prisma: PrismaService) {}

  async getDashboard(userId: string) {
    if (!userId) return [];

    // 1. Busca o grupo familiar
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    // 2. Filtro de família: vê os próprios e os da família
    const banks = await (this.prisma.piggyBank as any).findMany({
      where: { 
        active: true,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      include: {
        transactions: {
          where: { type: 'INCOME' }
        }
      }
    });

    return banks.map((bank: any) => {
      const totalSaved = bank.transactions.reduce((acc: number, t: any) => acc + t.amount, 0);
      const progress = bank.yearlyGoal > 0 ? (totalSaved / bank.yearlyGoal) * 100 : 0;

      return {
        ...bank,
        totalSaved,
        progress: Math.min(progress, 100)
      };
    });
  }

  async create(data: any) {
    // Busca o grupo familiar do criador
    const user = await this.prisma.user.findUnique({
      where: { id: data.userId },
      select: { familyGroupId: true }
    });

    return await (this.prisma.piggyBank as any).create({
      data: {
        name: data.name,
        imageUrl: data.imageUrl || null,
        monthlyGoal: data.monthlyGoal ? parseFloat(data.monthlyGoal.toString()) : 0,
        yearlyGoal: data.yearlyGoal ? parseFloat(data.yearlyGoal.toString()) : 0,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
        userId: data.userId,
        familyGroupId: user?.familyGroupId, // Carimba com a família
        active: true,
      } as any,
    });
  }

  async update(id: string, userId: string, data: any) {
    if (!userId) throw new BadRequestException('ID do usuário ausente.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    // Usamos updateMany para garantir permissão via ID do Cofrinho + (Sua ID ou Sua Família)
    const result = await (this.prisma.piggyBank as any).updateMany({
      where: { 
        id: id, 
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      data: {
        name: data.name,
        monthlyGoal: data.monthlyGoal ? parseFloat(data.monthlyGoal.toString()) : 0,
        yearlyGoal: data.yearlyGoal ? parseFloat(data.yearlyGoal.toString()) : 0,
        imageUrl: data.imageUrl,
        targetDate: data.targetDate ? new Date(data.targetDate) : null,
      },
    });

    if (result.count === 0) throw new NotFoundException('Cofrinho não encontrado ou sem permissão.');
    return result;
  }

  async remove(id: string, userId: string) {
    if (!userId) throw new BadRequestException('ID do usuário ausente.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });
    
    return (this.prisma.piggyBank as any).updateMany({
      where: { 
        id, 
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      data: { active: false }
    });
  }
}