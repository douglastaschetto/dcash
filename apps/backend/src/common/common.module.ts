import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { FamilyScopeService } from './scope/family-scope.service';
import { AdminGuard } from './guards/admin.guard';
import { EmailService } from './email/email.service';

@Module({
  imports: [DatabaseModule],
  providers: [FamilyScopeService, AdminGuard, EmailService],
  exports: [FamilyScopeService, AdminGuard, EmailService],
})
export class CommonModule {}
