import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { Category } from './category.entity';
import { FamilyGroup } from './family-group.entity';

@Entity('CategoryLimit')
export class CategoryLimit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'double precision' })
  amount: number;

  @Column({ type: 'integer' })
  month: number;

  @Column({ type: 'integer' })
  year: number;

  @ManyToOne(() => User, user => user.categoryLimits)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => Category, category => category.categoryLimits)
  category: Category;

  @Column({ type: 'uuid' })
  categoryId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp' })
  updatedAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.categoryLimits, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;
}