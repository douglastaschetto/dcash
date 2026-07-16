import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { PlanModule } from '../plan/plan.module';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [DatabaseModule, PlanModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
