import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { User } from '../models/user.entity';
import { PaymentMethod } from '../models/payment-method.entity';
import { Transaction } from '../models/transaction.entity';
import { Category } from '../models/category.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,

    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepo: Repository<PaymentMethod>,

    @InjectRepository(Transaction)
    private readonly transactionRepo: Repository<Transaction>,

    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
  ) {}

  async getSummary(userId: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const user = await this.userRepo.findOne({ where: { id: userId } });

    // contas (payment methods do tipo conta: 'CONTA', 'PIX', etc.)
    const accounts = await this.paymentMethodRepo.find({
      where: { userId },
    });

    const accountList = accounts.filter(
      (pm) => !['CARTAO_CREDITO', 'CREDIT_CARD', 'credit_card'].includes(pm.type),
    );
    const cardList = accounts.filter((pm) =>
      ['CARTAO_CREDITO', 'CREDIT_CARD', 'credit_card'].includes(pm.type),
    );

    // transações do mês
    const transactions = await this.transactionRepo.find({
      where: {
        userId,
        date: Between(startOfMonth, endOfMonth),
      },
    });

    const monthlyReceipt = transactions
      .filter((t) => t.type === 'INCOME' || t.type === 'income' || t.amount > 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const monthlyExpense = transactions
      .filter((t) => t.type === 'EXPENSE' || t.type === 'expense' || t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    // saldo geral = soma dos saldos das contas (calcula via transações de cada conta)
    const allTransactions = await this.transactionRepo.find({ where: { userId } });
    const generalBalance = allTransactions.reduce((sum, t) => {
      if (t.type === 'INCOME' || t.type === 'income') return sum + t.amount;
      if (t.type === 'EXPENSE' || t.type === 'expense') return sum - Math.abs(t.amount);
      return sum + t.amount;
    }, 0);

    // categorias do usuário
    const categories = await this.categoryRepo.find({ where: { userId } });

    return {
      user: {
        id: user?.id,
        name: user?.name ?? 'Usuário',
        email: user?.email,
        avatar: user?.avatar,
      },
      generalBalance: Math.round(generalBalance * 100) / 100,
      monthlyReceipt: Math.round(monthlyReceipt * 100) / 100,
      monthlyExpense: Math.round(monthlyExpense * 100) / 100,
      accounts: accountList.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        icon: a.icon || '🏦',
        color: a.color,
        balance: 0,
      })),
      creditCards: cardList.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        icon: c.icon || '💳',
        limit: c.paymentLimit ?? 0,
        available: c.paymentLimit ?? 0,
        invoice: 0,
        closingDay: c.closingDay,
        dueDay: c.dueDay,
      })),
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        type: cat.type,
        color: cat.color,
        icon: cat.icon || '📁',
      })),
    };
  }
}
