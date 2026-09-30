import { Module } from '@nestjs/common';
import { CategoryLimitsController } from './category-limits.controller';
import { CategoryLimitsService } from './category-limits.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, AuthModule, CommonModule],
  controllers: [CategoryLimitsController],
  providers: [CategoryLimitsService],
  exports: [CategoryLimitsService],
})
export class CategoryLimitsModule {}
