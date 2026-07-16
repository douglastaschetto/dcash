import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany } from 'typeorm';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';
import { PriceHunting } from './price-hunting.entity';

@Entity('Wishlist')
export class Wishlist {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  product: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  imageUrl: string;

  @Column({ type: 'uuid', nullable: true })
  categoryId: string;

  @Column({ type: 'varchar', length: 255, default: '3 - Baixo' })
  priority: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string;

  @Column({ type: 'boolean', default: false })
  bought: boolean;

  @ManyToOne(() => User, user => user.wishlists)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.wishlists, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;

  @OneToMany(() => PriceHunting, priceHunting => priceHunting.wishlist)
  priceHuntings: PriceHunting[];
}