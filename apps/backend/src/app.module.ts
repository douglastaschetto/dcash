import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from 'prisma/prisma.module';
import { FamilyModule } from './family/family.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DreamsModule } from './dreams/dreams.module';
import { UploadModule } from './upload/upload.module';
import { PiggyBanksModule } from './piggy-banks/piggy-banks.module';
import { ChallengesModule } from './challenges/challenges.module';
import { TransactionsModule } from './transactions/transactions.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { CategoryLimitsModule } from './category-limits/category-limits.module';
import { CategoriesModule } from './categories/categories.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { FixedBillsModule } from './fixed-bills/fixed-bills.module';
import { TodosModule } from './todos/todos.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule, 
    FamilyModule, 
    DashboardModule, 
    DreamsModule,
    UploadModule,
    PiggyBanksModule,
    ChallengesModule,
    TransactionsModule,
    PaymentMethodsModule,
    CategoryLimitsModule,
    CategoriesModule,
    WishlistModule,
    FixedBillsModule,
    TodosModule
    ],
})
export class AppModule {}