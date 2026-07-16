import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { FamilyGroup } from './family-group.entity';
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

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255 })
  password: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatar: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string;

  @Column({ type: 'varchar', length: 10, nullable: true, default: 'system' })
  theme: string;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.users, { nullable: true })
  @JoinColumn({ name: 'family_group_id' })
  familyGroup: FamilyGroup;

  @Column({ name: 'family_group_id', type: 'uuid', nullable: true, insert: false, update: false })
  familyGroupId: string;

  @OneToMany(() => Category, category => category.user)
  categories: Category[];

  @OneToMany(() => PaymentMethod, paymentMethod => paymentMethod.user)
  paymentMethods: PaymentMethod[];

  @OneToMany(() => Transaction, transaction => transaction.user)
  transactions: Transaction[];

  @OneToMany(() => PaymentMethod, paymentMethod => paymentMethod.owner)
  ownedPaymentMethods: PaymentMethod[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlists: Wishlist[];

  @OneToMany(() => PriceHunting, priceHunting => priceHunting.user)
  priceHuntings: PriceHunting[];

  @OneToMany(() => PiggyBank, piggyBank => piggyBank.user)
  piggyBanks: PiggyBank[];

  @OneToMany(() => DreamGoal, dreamGoal => dreamGoal.user)
  dreamGoals: DreamGoal[];

  @OneToMany(() => CategoryLimit, categoryLimit => categoryLimit.user)
  categoryLimits: CategoryLimit[];

  @OneToMany(() => Debtor, debtor => debtor.user)
  debtors: Debtor[];

  @OneToMany(() => FinancialChallenge, financialChallenge => financialChallenge.user)
  financialChallenges: FinancialChallenge[];

  @OneToMany(() => Debt, debt => debt.user)
  debts: Debt[];

  @OneToMany(() => FixedBill, fixedBill => fixedBill.user)
  fixedBills: FixedBill[];

  @OneToMany(() => Todo, todo => todo.user)
  todos: Todo[];
}