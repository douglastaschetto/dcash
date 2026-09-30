import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TransactionsController } from './transactions.controller';
import { TransactionsService } from './transactions.service';
import { DatabaseModule } from '../database/database.module';
import { PlanModule } from '../plan/plan.module';
import { CategoriesModule } from '../categories/categories.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    DatabaseModule,
    MulterModule.register({ limits: { fileSize: 10 * 1024 * 1024 } }),
    PlanModule,
    CategoriesModule,
    CommonModule,
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
