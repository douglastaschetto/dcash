import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';
import { DreamGoal } from './dream-goal.entity';

@Entity('PiggyBank')
export class PiggyBank {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'double precision', default: 1000 })
  monthlyGoal: number;

  @Column({ type: 'double precision', default: 12000 })
  yearlyGoal: number;

  @Column({ type: 'double precision', default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  color: string;

  @ManyToOne(() => User, user => user.piggyBanks)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'boolean', default: true })
  active: boolean;

  @Column({ type: 'timestamp', nullable: true })
  targetDate: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.piggyBanks, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;

  @ManyToOne(() => DreamGoal, dreamGoal => dreamGoal.piggyBank, { nullable: true })
  dreamGoal: DreamGoal;
}