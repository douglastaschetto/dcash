import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';
import { Transaction } from './transaction.entity';
import { CategoryLimit } from './category-limit.entity';
import { FixedBill } from './fixed-bill.entity';

export enum CategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  RESERVE = 'reserve',
}

@Entity('category')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.categories)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', insert: false, update: false })
  userId: string;

  @Column({ type: 'varchar', length: 255, default: '#3b82f6' })
  color: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.categories, { nullable: true })
  @JoinColumn({ name: 'family_group_id' })
  familyGroup: FamilyGroup;

  @Column({ name: 'family_group_id', type: 'uuid', nullable: true, insert: false, update: false })
  familyGroupId: string;

  @OneToMany(() => Transaction, transaction => transaction.category)
  transactions: Transaction[];

  @OneToMany(() => CategoryLimit, categoryLimit => categoryLimit.category)
  categoryLimits: CategoryLimit[];

  @OneToMany(() => FixedBill, fixedBill => fixedBill.category)
  fixedBills: FixedBill[];
}