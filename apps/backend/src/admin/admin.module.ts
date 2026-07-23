import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlanModule } from '../plan/plan.module';
import { GuidedToursModule } from '../guided-tours/guided-tours.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [DatabaseModule, PlanModule, GuidedToursModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
