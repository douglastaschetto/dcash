import { AdminGuard } from '../common/guards/admin.guard';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [ConfigModule, DatabaseModule, AuthModule, PlanModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, AdminGuard],
  exports: [NotificationsService],
})
export class NotificationsModule {}
