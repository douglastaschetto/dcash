import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';
import { Transaction } from './transaction.entity';

@Entity('payment_method')
export class PaymentMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  type: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  icon: string;

  @Column({ name: 'cover_image', type: 'varchar', length: 255, nullable: true })
  coverImage: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  color: string;

  @Column({ name: 'payment_limit', type: 'double precision', nullable: true })
  paymentLimit: number;

  @Column({ name: 'closing_day', type: 'integer', nullable: true })
  closingDay: number;

  @Column({ name: 'due_day', type: 'integer', nullable: true })
  dueDay: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string;

  @ManyToOne(() => User, user => user.paymentMethods)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id', type: 'uuid', insert: false, update: false })
  userId: string;

  @Column({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.paymentMethods, { nullable: true })
  @JoinColumn({ name: 'family_group_id' })
  familyGroup: FamilyGroup;

  @Column({ name: 'family_group_id', type: 'uuid', nullable: true, insert: false, update: false })
  familyGroupId: string;

  @ManyToOne(() => User, user => user.ownedPaymentMethods, { nullable: true })
  @JoinColumn({ name: 'owner_id' })
  owner: User;

  @Column({ name: 'owner_id', type: 'uuid', nullable: true, insert: false, update: false })
  ownerId: string;

  @OneToMany(() => Transaction, transaction => transaction.paymentMethod)
  transactions: Transaction[];

  @OneToMany(() => User, user => user.ownedPaymentMethods)
  ownedByUsers: User[];
}