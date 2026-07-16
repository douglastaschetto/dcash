import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';

@Entity('Debt')
export class Debt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  creditor: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'timestamp' })
  debtDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  endDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextDueDate: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  paidValue: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pendingValue: number;

  @Column({ type: 'integer', default: 0 })
  currentInstallment: number;

  @Column({ type: 'integer' })
  totalInstallments: number;

  @Column({ type: 'varchar', length: 255 })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 255, default: 'A pagar' })
  status: string;

  @ManyToOne(() => User, user => user.debts)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.debts, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;
}