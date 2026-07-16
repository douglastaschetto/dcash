import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';

@Entity('Todo')
export class Todo {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'boolean', default: false })
  isCompleted: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => User, user => user.todos)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.todos, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;
}