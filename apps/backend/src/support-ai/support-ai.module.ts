import { Module } from '@nestjs/common';
import { SupportAiController } from './support-ai.controller';
import { SupportAiService } from './support-ai.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { TransactionsModule } from '../transactions/transactions.module';
import { CategoryLimitsModule } from '../category-limits/category-limits.module';
import { FixedBillsModule } from '../fixed-bills/fixed-bills.module';
import { PiggyBanksModule } from '../piggy-banks/piggy-banks.module';
import { DreamsModule } from '../dreams/dreams.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    PaymentMethodsModule,
    TransactionsModule,
    CategoryLimitsModule,
    FixedBillsModule,
    PiggyBanksModule,
    DreamsModule,
    PlanModule,
  ],
  controllers: [SupportAiController],
  providers: [SupportAiService],
})
export class SupportAiModule {}
