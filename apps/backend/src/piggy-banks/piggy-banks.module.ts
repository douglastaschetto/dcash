import { Module } from '@nestjs/common';
import { PiggyBanksController } from './piggy-banks.controller';
import { PiggyBanksService } from './piggy-banks.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PiggyBanksController],
  providers: [PiggyBanksService],
  exports: [PiggyBanksService],
})
export class PiggyBanksModule {}
