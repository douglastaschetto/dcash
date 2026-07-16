import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';
import { PiggyBank } from './piggy-bank.entity';

@Entity('DreamGoal')
export class DreamGoal {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'double precision' })
  targetValue: number;

  @Column({ type: 'double precision', default: 0 })
  savedValue: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @ManyToOne(() => User, user => user.dreamGoals)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => PiggyBank, piggyBank => piggyBank.dreamGoal, { nullable: true })
  piggyBank: PiggyBank;

  @Column({ type: 'uuid', nullable: true })
  piggyBankId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.dreamGoals, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;

  @Column({ type: 'timestamp', nullable: true })
  deadline: Date;
}