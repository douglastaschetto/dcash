import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { Wishlist } from './wishlist.entity';
import { User } from './user.entity';
import { FamilyGroup } from './family-group.entity';

@Entity('PriceHunting')
export class PriceHunting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  store: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  link: string;

  @Column({ type: 'double precision', default: 0 })
  cashPrice: number;

  @Column({ type: 'double precision', default: 0 })
  installmentPrice: number;

  @Column({ type: 'integer', default: 1 })
  installments: number;

  @Column({ type: 'double precision', default: 0 })
  shipping: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  observations: string;

  @Column({ type: 'varchar', length: 255, default: 'PENDING' })
  decision: string;

  @ManyToOne(() => Wishlist, wishlist => wishlist.priceHuntings)
  wishlist: Wishlist;

  @Column({ type: 'uuid' })
  wishlistId: string;

  @ManyToOne(() => User, user => user.priceHuntings)
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @ManyToOne(() => FamilyGroup, familyGroup => familyGroup.priceHuntings, { nullable: true })
  familyGroup: FamilyGroup;

  @Column({ type: 'uuid', nullable: true })
  familyGroupId: string;
}