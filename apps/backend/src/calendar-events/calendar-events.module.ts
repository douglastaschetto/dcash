import { Module } from '@nestjs/common';
import { CalendarEventsService } from './calendar-events.service';
import { CalendarEventsController } from './calendar-events.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, AuthModule, CommonModule],
  controllers: [CalendarEventsController],
  providers: [CalendarEventsService],
  exports: [CalendarEventsService],
})
export class CalendarEventsModule {}
