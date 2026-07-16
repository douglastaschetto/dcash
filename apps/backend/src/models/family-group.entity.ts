import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { PaymentMethod } from './payment-method.entity';
import { Transaction } from './transaction.entity';
import { Wishlist } from './wishlist.entity';
import { PriceHunting } from './price-hunting.entity';
import { PiggyBank } from './piggy-bank.entity';
import { DreamGoal } from './dream-goal.entity';
import { CategoryLimit } from './category-limit.entity';
import { Debtor } from './debtor.entity';
import { FinancialChallenge } from './financial-challenge.entity';
import { Debt } from './debt.entity';
import { FixedBill } from './fixed-bill.entity';
import { Todo } from './todo.entity';

@Entity('family_groups')
export class FamilyGroup {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'invite_code', type: 'varchar', length: 255, unique: true })
  inviteCode: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @OneToMany(() => User, user => user.familyGroup)
  users: User[];

  @OneToMany(() => Category, category => category.familyGroup)
  categories: Category[];

  @OneToMany(() => PaymentMethod, paymentMethod => paymentMethod.familyGroup)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Transaction, transaction => transaction.familyGroup)
  transactions: Transaction[];

  @OneToMany(() => Wishlist, wishlist => wishlist.familyGroup)
  wishlists: Wishlist[];

  @OneToMany(() => PriceHunting, priceHunting => priceHunting.familyGroup)
  priceHuntings: PriceHunting[];

  @OneToMany(() => PiggyBank, piggyBank => piggyBank.familyGroup)
  piggyBanks: PiggyBank[];

  @OneToMany(() => DreamGoal, dreamGoal => dreamGoal.familyGroup)
  dreamGoals: DreamGoal[];

  @OneToMany(() => CategoryLimit, categoryLimit => categoryLimit.familyGroup)
  categoryLimits: CategoryLimit[];

  @OneToMany(() => Debtor, debtor => debtor.familyGroup)
  debtors: Debtor[];

  @OneToMany(() => FinancialChallenge, financialChallenge => financialChallenge.familyGroup)
  financialChallenges: FinancialChallenge[];

  @OneToMany(() => Debt, debt => debt.familyGroup)
  debts: Debt[];

  @OneToMany(() => FixedBill, fixedBill => fixedBill.familyGroup)
  fixedBills: FixedBill[];

  @OneToMany(() => Todo, todo => todo.familyGroup)
  todos: Todo[];
}