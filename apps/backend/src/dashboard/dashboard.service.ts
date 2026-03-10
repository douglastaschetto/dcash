// apps/backend/src/dashboard/dashboard.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getData(userId: string, month: number, year: number) {
    if (!userId) throw new NotFoundException('User ID is required');

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    const familyGroupId = user?.familyGroupId;

    const baseFilter = familyGroupId 
      ? { familyGroupId } 
      : { userId, familyGroupId: null };

    const [transactions, dreams, piggyBanks, challenges, categories, fixedBills] = await Promise.all([
      (this.prisma.transaction as any).findMany({
        where: { ...baseFilter, date: { gte: startDate, lte: endDate } },
        include: { category: true, user: { select: { name: true, avatar: true } } },
        orderBy: { date: 'desc' },
      }),
      // AJUSTE 1: Sonhos sem filtro de data (todos os ativos)
      (this.prisma.dreamGoal as any).findMany({ where: { ...baseFilter }, take: 5 }),
      
      // AJUSTE 2: Cofrinhos sem filtro de data (sempre traz todos os ativos)
      (this.prisma.piggyBank as any).findMany({
        where: { ...baseFilter },
        include: { transactions: { where: { type: 'INCOME' } } }
      }),
      
      (this.prisma.financialChallenge as any).findMany({ where: { ...baseFilter, year } }),
      (this.prisma.category as any).findMany({
        where: { 
          OR: [
            { familyGroupId: familyGroupId || 'undefined' }, 
            { userId, familyGroupId: null }
          ]
        },
        include: { 
          transactions: { where: { date: { gte: startDate, lte: endDate }, ...baseFilter } },
          categoryLimits: { where: { month, year } } 
        }
      }),
      // AJUSTE 3: Garantindo que as Contas Fixas tragam a descrição
      (this.prisma.fixedBill as any).findMany({ where: { ...baseFilter } })
    ]);

    // Processamento
    const totalIncome = transactions.filter((t: any) => t.type === 'INCOME').reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t: any) => t.type === 'EXPENSE').reduce((s, t) => s + t.amount, 0);

    return {
      summary: { totalIncome, totalExpense, balance: totalIncome - totalExpense },
      recentTransactions: transactions.slice(0, 10),
      dreams,
      piggyBanks: piggyBanks.map((b: any) => ({
        ...b,
        totalSaved: b.transactions.reduce((s: number, t: any) => s + t.amount, 0)
      })),
      challenges,
      categoriesData: categories.map((cat: any) => ({
        id: cat.id,
        name: cat.name,
        amount: cat.transactions.reduce((s: number, t: any) => s + t.amount, 0),
        limit: cat.categoryLimits?.[0]?.amount || 0,
        color: cat.color || '#10b981',
      })),
      fixedBills,
    };
  }
}