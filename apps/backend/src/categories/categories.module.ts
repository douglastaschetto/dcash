import { Module } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { DatabaseModule } from '../database/database.module';
import { PlanModule } from '../plan/plan.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, PlanModule, CommonModule],
  controllers: [CategoriesController],
  providers: [CategoriesService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
