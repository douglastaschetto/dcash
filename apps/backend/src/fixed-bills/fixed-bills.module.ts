import { Module } from '@nestjs/common';
import { FixedBillsService } from './fixed-bills.service';
import { FixedBillsController } from './fixed-bills.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [FixedBillsController],
  providers: [FixedBillsService],
  exports: [FixedBillsService],
})
export class FixedBillsModule {}
