import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { FamilyGroup } from './family-group.entity';
import { PaymentMethod } from './payment-method.entity';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'double precision' })
  amount: number;

  @Column({ type: 'timestamp' })
  date: Date;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ name: 'is_paid', type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ name: 'installment_group', type: 'varchar', length: 255, nullable: true })
  installmentGroup: string;

  @Column({ name: 'total_installments', type: 'integer', nullable: true })
  totalInstallments: number;

  @ManyToOne(() => User, user => user.transactions)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', insert: false, update: false })
  userId: string;

  @ManyToOne(() => Category, category => category.transactions, { nullable: true })
  @JoinColumn({ name: 'category_id' })
  category: Category;

  @Column({ name: 'category_id', type: 'uuid', nullable: true, insert: false, update: false })
  categoryId: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamp', nullable: true })
  updatedAt: Date;

  @Column({ name: 'debt_id', type: 'uuid', nullable: true })
  debtId: string;

  @Column({ name: 'due_date', type: 'timestamp', nullable: true })
  dueDate: Date;

  @Column({ name: 'fixed_bill_id', type: 'uuid', nullable: true })
  fixedBillId: string;

  @Column({ name: 'installment_number', type: 'integer', nullable: true })
  installmentNumber: number;

  @ManyToOne(() => PaymentMethod, paymentMethod => paymentMethod.transactions, { nullable: true })
  @JoinColumn({ name: 'payment_method_id' })
  paymentMethod: PaymentMethod;

  @Column({ name: 'payment_method_id', type: 'uuid', nullable: true, insert: false, update: false })
  paymentMethodId: string;

  @Column({ name: 'piggy_bank_id', type: 'uuid', nullable: true })
  piggyBankId: string;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.transactions, { nullable: true })
  @JoinColumn({ name: 'family_group_id' })
  familyGroup: FamilyGroup;

  @Column({ name: 'family_group_id', type: 'uuid', nullable: true, insert: false, update: false })
  familyGroupId: string;

  @Column({ name: 'current_installment', type: 'integer', nullable: true })
  currentInstallment: number;

  @Column({ name: 'payment_method_type', type: 'varchar', length: 255, nullable: true })
  paymentMethodType: string;
}