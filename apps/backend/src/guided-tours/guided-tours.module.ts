import { Module } from '@nestjs/common';
import { GuidedToursController } from './guided-tours.controller';
import { GuidedToursService } from './guided-tours.service';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [GuidedToursController],
  providers: [GuidedToursService],
  exports: [GuidedToursService],
})
export class GuidedToursModule {}
