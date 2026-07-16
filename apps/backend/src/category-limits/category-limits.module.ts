import { Module } from '@nestjs/common';
import { CategoryLimitsController } from './category-limits.controller';
import { CategoryLimitsService } from './category-limits.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [CategoryLimitsController],
  providers: [CategoryLimitsService],
})
export class CategoryLimitsModule {}
