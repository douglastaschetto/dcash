import { Module } from '@nestjs/common';
import { FixedBillsService } from './fixed-bills.service';
import { FixedBillsController } from './fixed-bills.controller';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [FixedBillsController],
  providers: [FixedBillsService],
})
export class FixedBillsModule {}