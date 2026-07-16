import { Module } from '@nestjs/common';
import { InvestmentsController } from './investments.controller';
import { InvestmentsService } from './investments.service';
import { DatabaseModule } from '../database/database.module';
import { PlanModule } from '../plan/plan.module';

@Module({
  imports: [DatabaseModule, PlanModule],
  controllers: [InvestmentsController],
  providers: [InvestmentsService],
})
export class InvestmentsModule {}
