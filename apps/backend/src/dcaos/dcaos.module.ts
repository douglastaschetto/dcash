import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';
import { PaymentModule } from '../payment/payment.module';
import { DcaosAccessController, DcaosController } from './dcaos.controller';
import { DcaosAccessService, DcaosGuard } from './dcaos-access.service';
import { DcaosNotifyService } from './dcaos-notify.service';
import { DcaosTasksService } from './dcaos-tasks.service';
import { DcaosMarketService } from './dcaos-market.service';
import { DcaosNotesService } from './dcaos-notes.service';
import { DcaosAgendaService } from './dcaos-agenda.service';
import { DcaosHabitsService } from './dcaos-habits.service';
import { DcaosDatesService } from './dcaos-dates.service';
import { DcaosMaintenanceService } from './dcaos-maintenance.service';
import { DcaosPushService } from './dcaos-push.service';
import { DcaosCalendarService } from './dcaos-calendar.service';
import { DcaosBriefingService } from './dcaos-briefing.service';

/** DCaos — family chaos manager (paid add-on). */
@Module({
  imports: [DatabaseModule, AuthModule, CommonModule, PaymentModule],
  controllers: [DcaosAccessController, DcaosController],
  providers: [
    DcaosAccessService,
    DcaosGuard,
    DcaosNotifyService,
    DcaosTasksService,
    DcaosMarketService,
    DcaosNotesService,
    DcaosAgendaService,
    DcaosHabitsService,
    DcaosDatesService,
    DcaosMaintenanceService,
    DcaosPushService,
    DcaosCalendarService,
    DcaosBriefingService,
  ],
  exports: [DcaosAccessService, DcaosNotifyService, DcaosPushService],
})
export class DcaosModule {}
