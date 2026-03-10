import { Injectable, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Helper privado para buscar o grupo familiar do usuário
   */
  private async getUserFamily(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { familyGroupId: true },
    });
    return user?.familyGroupId || null;
  }

  /**
   * CRIAÇÃO: Gerencia lançamentos únicos, parcelamentos e cofrinhos
   */
  async create(userId: string, dto: CreateTransactionDto) {
    const familyGroupId = await this.getUserFamily(userId);
    const { 
      installments, 
      paymentMethodId, 
      piggyBankId, 
      date, 
      amount, 
      type,
      categoryId 
    } = dto;

    const baseDate = new Date(date);
    
    // 1. Lógica para Aporte em COFRINHO
    if (piggyBankId) {
      return this.handlePiggyBankTransaction(userId, familyGroupId, dto);
    }

    // 2. Lógica para PARCELAMENTO (Somente Despesas com Cartão/Método definido)
    if (installments && installments > 1 && paymentMethodId && type === 'EXPENSE') {
      return this.handleInstallments(userId, familyGroupId, dto);
    }

    // 3. Lançamento Único (Padrão)
    return (this.prisma.transaction as any).create({
      data: {
        description: dto.description,
        amount: Number(amount),
        type,
        date: baseDate,
        userId,
        familyGroupId, 
        categoryId,
        paymentMethodId,
        paymentMethodType: dto.paymentMethodType || 'OTHER',
      },
    });
  }

  /**
   * LISTAGEM: Busca transações da família ou individuais
   */
  async findAll(userId: string) {
    const familyGroupId = await this.getUserFamily(userId);

    return (this.prisma.transaction as any).findMany({
      where: {
        OR: [
          { familyGroupId: familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
      include: {
        category: true,
        paymentMethod: true,
        piggyBank: true,
      },
      orderBy: { date: 'desc' },
    });
  }

  /**
   * ATUALIZAÇÃO (PATCH): Permite ajustar valor/descrição de transações individuais
   * Essencial para ajustar contas fixas variáveis (Luz, Água) sem mudar o modelo.
   */
  async update(id: string, userId: string, data: any) {
    const familyGroupId = await this.getUserFamily(userId);
    
    // 1. Verifica se a transação existe e se o usuário tem permissão (Mesma família)
    const transaction = await (this.prisma.transaction as any).findFirst({
      where: {
        id,
        OR: [
          { familyGroupId: familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      }
    });

    if (!transaction) {
      throw new NotFoundException('Transação não encontrada ou sem permissão de acesso.');
    }

    // 2. Tratamento dos dados para o Prisma
    const updateData: any = { ...data };
    
    if (updateData.amount) updateData.amount = Number(updateData.amount);
    if (updateData.date) updateData.date = new Date(updateData.date);
    
    // 3. Segurança: Remove campos que não devem ser alterados via PATCH simples
    delete updateData.id;
    delete updateData.userId;
    delete updateData.familyGroupId;
    delete updateData.fixedBillId; // O vínculo com o modelo nunca muda

    return (this.prisma.transaction as any).update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * REMOÇÃO: Suporta exclusão única ou de todo um grupo de parcelamento
   */
  async remove(id: string, userId: string, deleteAll: boolean = false) {
    const familyGroupId = await this.getUserFamily(userId);
    
    const transaction = await (this.prisma.transaction as any).findFirst({
      where: { 
        id,
        OR: [
          { familyGroupId: familyGroupId, NOT: { familyGroupId: null } },
          { userId: userId, familyGroupId: null }
        ]
      },
    });

    if (!transaction) throw new NotFoundException('Transação não encontrada');

    // Se for parcelamento e o usuário quiser apagar tudo (deleteAll=true)
    if (deleteAll && transaction.installmentGroup) {
      return (this.prisma.transaction as any).deleteMany({
        where: { 
          installmentGroup: transaction.installmentGroup,
          OR: [
            { familyGroupId: familyGroupId },
            { userId: userId }
          ]
        },
      });
    }

    // Estorno de saldo se for uma transação de cofrinho
    if (transaction.piggyBankId) {
      await (this.prisma.piggyBank as any).update({
        where: { id: transaction.piggyBankId },
        data: { balance: { decrement: transaction.amount } }
      });
    }

    return (this.prisma.transaction as any).delete({ where: { id } });
  }

  /**
   * LÓGICA DE PARCELAMENTO
   */
  private async handleInstallments(userId: string, familyGroupId: string | null, dto: CreateTransactionDto) {
    const { paymentMethodId, installments, amount, date, description, categoryId } = dto;

    const method = await (this.prisma.paymentMethod as any).findUnique({
      where: { id: paymentMethodId },
    });

    if (!method) throw new NotFoundException('Meio de pagamento não encontrado');

    const installmentGroup = uuidv4();
    const installmentAmount = Number((amount / installments!).toFixed(2));
    const transactionsData: any[] = []; 

    for (let i = 0; i < installments!; i++) {
      let dueDate = new Date(date);
      let monthOffset = i;

      // Regra de fechamento de fatura de cartão
      if (method.type === 'CREDIT_CARD' && method.closingDay && method.dueDay) {
        if (new Date(date).getDate() > method.closingDay) {
          monthOffset += 1;
        }
        dueDate = new Date(dueDate.getFullYear(), dueDate.getMonth() + monthOffset, method.dueDay);
      } else {
        dueDate.setMonth(dueDate.getMonth() + i);
      }

      transactionsData.push({
        description: `${description} (${i + 1}/${installments})`,
        amount: installmentAmount,
        type: 'EXPENSE',
        date: dueDate,
        userId,
        familyGroupId,
        categoryId,
        paymentMethodId,
        installmentGroup,
        paymentMethodType: method.type,
      });
    }

    return (this.prisma.transaction as any).createMany({
      data: transactionsData,
    });
  }

  /**
   * LÓGICA DE COFRINHO (Aportes)
   */
  private async handlePiggyBankTransaction(userId: string, familyGroupId: string | null, dto: CreateTransactionDto) {
    const { piggyBankId, amount, description, date, categoryId } = dto;
    
    const transaction = await (this.prisma.transaction as any).create({
      data: {
        description: `Aporte: ${description}`,
        amount: Number(amount),
        type: 'EXPENSE',
        date: new Date(date),
        userId,
        familyGroupId,
        categoryId,
        piggyBankId,
      },
    });

    await (this.prisma.piggyBank as any).update({
      where: { id: piggyBankId },
      data: { balance: { increment: Number(amount) } },
    });

    return transaction;
  }
}