import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { User } from '../models/user.entity';
import { PaymentMethod } from '../models/payment-method.entity';
import { Transaction } from '../models/transaction.entity';
import { Category } from '../models/category.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, PaymentMethod, Transaction, Category])],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
