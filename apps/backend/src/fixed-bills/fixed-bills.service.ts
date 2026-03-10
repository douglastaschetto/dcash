import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateFixedBillDto } from './dto/create-fixed-bill.dto';
import { addMonths, isBefore, isSameMonth, startOfMonth, endOfMonth } from 'date-fns';

@Injectable()
export class FixedBillsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * CRIAÇÃO: Gera o modelo (FixedBill) e as projeções mensais (Transactions)
   */
  async create(userId: string, dto: CreateFixedBillDto & { endDate?: string }) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    // --- CORREÇÃO PARA "Argument category is missing" ---
    let finalCategoryId = dto.categoryId;

    // Se a categoria vier undefined ou vazia, tentamos buscar a primeira categoria disponível
    if (!finalCategoryId || finalCategoryId === 'undefined') {
      const defaultCategory = await this.prisma.category.findFirst({
        where: {
          OR: [
            { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
            { userId: userId, familyGroupId: null }
          ]
        }
      });

      if (!defaultCategory) {
        throw new BadRequestException('Nenhuma categoria encontrada. Crie uma categoria (ex: Moradia, Alimentação) antes de cadastrar contas fixas.');
      }
      finalCategoryId = defaultCategory.id;
    }

    // 1. Cria o "Molde" na tabela FixedBill
    const fixedBill = await (this.prisma.fixedBill as any).create({
      data: {
        description: dto.description,
        amount: Number(dto.amount),
        dayOfMonth: Number(dto.dayOfMonth),
        dueDay: Number(dto.dayOfMonth),
        categoryId: finalCategoryId,
        paymentMethodType: dto.paymentMethodType || 'OTHER',
        // Garante NULL se não for cartão para evitar erro P2003
        paymentMethodId: dto.paymentMethodType === 'CREDIT_CARD' ? dto.paymentMethodId : null,
        userId: userId,
        familyGroupId: user?.familyGroupId,
        isPaid: false,
      },
    });

    // 2. Define o período de projeção
    const startDate = new Date();
    const limitDate = dto.endDate ? new Date(dto.endDate) : addMonths(startDate, 11);
    
    const transactionsData: any[] = [];
    let currentIterDate = startDate;

    while (isBefore(currentIterDate, limitDate) || isSameMonth(currentIterDate, limitDate)) {
      const year = currentIterDate.getFullYear();
      const month = currentIterDate.getMonth();
      const dueDate = new Date(year, month, Number(dto.dayOfMonth));

      transactionsData.push({
        description: fixedBill.description,
        amount: Number(dto.amount),
        type: 'EXPENSE',
        date: dueDate,
        userId: userId,
        familyGroupId: user?.familyGroupId,
        categoryId: finalCategoryId,
        fixedBillId: fixedBill.id,
        isPaid: false,
        paymentMethodType: dto.paymentMethodType || 'OTHER',
        paymentMethodId: dto.paymentMethodType === 'CREDIT_CARD' ? dto.paymentMethodId : null,
      });

      currentIterDate = addMonths(currentIterDate, 1);
    }

    if (transactionsData.length > 0) {
      await (this.prisma.transaction as any).createMany({
        data: transactionsData,
      });
    }

    return fixedBill;
  }

  /**
   * LISTAGEM: Busca transações individuais e agrupa faturas de cartão separadamente
   */
  async findAll(userId: string, month?: number, year?: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    const targetMonth = month ? month - 1 : new Date().getMonth();
    const targetYear = year || new Date().getFullYear();
    const start = startOfMonth(new Date(targetYear, targetMonth));
    const end = endOfMonth(new Date(targetYear, targetMonth));

    const transactions = await (this.prisma.transaction as any).findMany({
      where: {
        fixedBillId: { not: null },
        paymentMethodType: { not: 'CREDIT_CARD' }, 
        date: { gte: start, lte: end },
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      include: { category: true }
    });

    const mappedBills = transactions.map(t => ({
      id: t.id,
      fixedBillId: t.fixedBillId,
      description: t.description,
      amount: t.amount,
      dayOfMonth: new Date(t.date).getDate(),
      paymentMethodType: t.paymentMethodType,
      isCardAggregation: false,
      isPaid: t.isPaid,
      category: t.category
    }));

    const creditCardAggregation = await (this.prisma.transaction as any).groupBy({
      by: ['paymentMethodId'],
      where: {
        paymentMethodType: 'CREDIT_CARD',
        date: { gte: start, lte: end },
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      _sum: { amount: true }
    });

    const cardIds = creditCardAggregation.map(c => c.paymentMethodId).filter(Boolean);
    const paymentMethods = await (this.prisma.paymentMethod as any).findMany({
      where: { id: { in: cardIds } }
    });

    const cardBills = creditCardAggregation.map(cardGroup => {
      const method = paymentMethods.find(m => m.id === cardGroup.paymentMethodId);
      return {
        id: `card-${cardGroup.paymentMethodId}`,
        description: method ? `Fatura: ${method.name}` : `Fatura Cartão de Crédito`,
        amount: cardGroup._sum.amount || 0,
        dayOfMonth: method?.dueDay || 10,
        paymentMethodType: 'CREDIT_CARD',
        isCardAggregation: true
      };
    });

    return [...mappedBills, ...cardBills].sort((a, b) => a.dayOfMonth - b.dayOfMonth);
  }

  /**
   * ATUALIZAÇÃO: Resolve o erro P2003 e garante consistência de categoria
   */
  async update(userId: string, id: string, dto: Partial<CreateFixedBillDto>) {
    const transaction = await this.prisma.transaction.findUnique({ where: { id } });
    if (!transaction) throw new NotFoundException('Lançamento não encontrado.');

    const isCreditCard = dto.paymentMethodType === 'CREDIT_CARD';
    const finalPaymentMethodId = (isCreditCard && dto.paymentMethodId?.trim()) 
      ? dto.paymentMethodId 
      : null;

    try {
      return await this.prisma.transaction.update({
        where: { id },
        data: {
          description: dto.description,
          amount: dto.amount ? Number(dto.amount) : undefined,
          paymentMethodType: dto.paymentMethodType,
          paymentMethodId: finalPaymentMethodId,
          categoryId: dto.categoryId || undefined, // Só atualiza se for enviado
        },
      });
    } catch (error) {
      if (error.code === 'P2003') {
        throw new BadRequestException('O cartão selecionado é inválido ou não existe.');
      }
      throw error;
    }
  }

  /**
   * REMOÇÃO: Remove o modelo e projeções futuras não pagas
   */
  async remove(userId: string, fixedBillId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });

    await (this.prisma.transaction as any).deleteMany({
      where: {
        fixedBillId: fixedBillId,
        isPaid: false,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    const result = await (this.prisma.fixedBill as any).deleteMany({
      where: {
        id: fixedBillId,
        OR: [
          { familyGroupId: user?.familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (result.count === 0) throw new NotFoundException('Modelo de conta não encontrado.');
    return result;
  }
}