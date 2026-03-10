import { 
  Injectable, 
  BadRequestException,
  NotFoundException
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UpsertCategoryLimitDto } from './dto/upsert-category-limit.dto';

@Injectable()
export class CategoryLimitsService {
  constructor(private prisma: PrismaService) {}

  async findAll(userId: string, month: number, year: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    return (this.prisma.categoryLimit as any).findMany({
      where: {
        month: month,
        year: year,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      include: { category: true }
    });
  }

  async getDashboard(userId: string, month: number, year: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const limits = await (this.prisma.categoryLimit as any).findMany({
      where: {
        month,
        year,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      include: { category: true },
    });

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    const expenses = await (this.prisma.transaction as any).groupBy({
      by: ['categoryId'],
      where: {
        type: 'EXPENSE',
        date: { gte: startOfMonth, lte: endOfMonth },
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      _sum: { amount: true },
    });

    return limits.map((limit: any) => {
      const spent = expenses.find((e: any) => e.categoryId === limit.categoryId)?._sum.amount || 0;
      return {
        id: limit.id,
        amount: limit.amount,
        month: limit.month,
        year: limit.year,
        categoryId: limit.categoryId,
        spent,
        percent: limit.amount > 0 ? (spent / limit.amount) * 100 : 0,
        category: limit.category,
      };
    });
  }

  async upsertLimit(userId: string, data: UpsertCategoryLimitDto) {
    if (!userId) throw new BadRequestException('ID ausente.');

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const existingLimit = await (this.prisma.categoryLimit as any).findFirst({
      where: {
        categoryId: data.categoryId,
        month: data.month,
        year: data.year,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (existingLimit) {
      return this.prisma.categoryLimit.update({
        where: { id: existingLimit.id },
        data: { amount: data.amount }
      });
    }

    return (this.prisma.categoryLimit as any).create({
      data: {
        amount: data.amount,
        month: data.month,
        year: data.year,
        categoryId: data.categoryId,
        userId: userId,
        familyGroupId: user?.familyGroupId,
      } as any,
    });
  }

  async remove(id: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true }
    });

    const result = await (this.prisma.categoryLimit as any).deleteMany({
      where: {
        id: id,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (result.count === 0) {
      throw new NotFoundException('Limite não encontrado ou sem permissão.');
    }

    return result;
  }
}