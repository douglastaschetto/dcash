import { Module } from '@nestjs/common';
import { DreamsService } from './dreams.service';
import { DreamsController } from './dreams.controller';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [DatabaseModule, AuthModule, CommonModule],
  controllers: [DreamsController],
  providers: [DreamsService],
  exports: [DreamsService],
})
export class DreamsModule {}
