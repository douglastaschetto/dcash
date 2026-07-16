import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { FamilyGroup } from './family-group.entity';

@Entity('fixed_bills')
export class FixedBill {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  description: string;

  @Column({ type: 'double precision' })
  amount: number;

  @Column({ type: 'integer' })
  dayOfMonth: number;

  @Column({ type: 'boolean', default: false })
  isCreditCard: boolean;

  @ManyToOne(() => Category, category => category.fixedBills)
  category: Category;

  @Column({ type: 'uuid' })
  categoryId: string;

  @ManyToOne(() => User, user => user.fixedBills)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'integer', nullable: true })
  dueDay: number;

  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'varchar', length: 255, default: 'OTHER' })
  paymentMethodType: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.fixedBills, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;
}