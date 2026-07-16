import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';

@Entity('FinancialChallenge')
export class FinancialChallenge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  month: string;

  @Column({ type: 'integer' })
  year: number;

  @Column({ type: 'varchar', length: 255 })
  challenge: string;

  @Column({ type: 'varchar', length: 255, default: 'Não iniciada' })
  status: string;

  @Column({ type: 'varchar', length: 255, default: 'Não realizado' })
  achieved: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observations: string;

  @ManyToOne(() => User, user => user.financialChallenges)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.financialChallenges, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;
}