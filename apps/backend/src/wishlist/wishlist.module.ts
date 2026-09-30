import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, CommonModule],
  controllers: [WishlistController],
  providers: [WishlistService],
})
export class WishlistModule {}
