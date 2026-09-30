import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { CommonModule } from './common/common.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { FamilyModule } from './family/family.module';
import { CategoryLimitsModule } from './category-limits/category-limits.module';
import { TodosModule } from './todos/todos.module';
import { ChallengesModule } from './challenges/challenges.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { UploadModule } from './upload/upload.module';
import { PiggyBanksModule } from './piggy-banks/piggy-banks.module';
import { DreamsModule } from './dreams/dreams.module';
import { FixedBillsModule } from './fixed-bills/fixed-bills.module';
import { CalendarEventsModule } from './calendar-events/calendar-events.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PlanModule } from './plan/plan.module';
import { AdminModule } from './admin/admin.module';
import { PaymentModule } from './payment/payment.module';
import { TransactionsModule } from './transactions/transactions.module';
import { InvestmentsModule } from './investments/investments.module';
import { SupportAiModule } from './support-ai/support-ai.module';
import { GuidedToursModule } from './guided-tours/guided-tours.module';

@Module({
  imports: [
    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),
    DatabaseModule,
    CommonModule,
    HealthModule,
    AuthModule,
    CategoriesModule,
    DashboardModule,
    PaymentMethodsModule,
    FamilyModule,
    CategoryLimitsModule,
    TodosModule,
    ChallengesModule,
    WishlistModule,
    UploadModule,
    PiggyBanksModule,
    DreamsModule,
    FixedBillsModule,
    CalendarEventsModule,
    NotificationsModule,
    PlanModule,
    AdminModule,
    PaymentModule,
    TransactionsModule,
    InvestmentsModule,
    SupportAiModule,
    GuidedToursModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
