import { Module } from '@nestjs/common';
import { CategoryLimitsController } from './category-limits.controller';
import { CategoryLimitsService } from './category-limits.service';
import { PrismaModule } from 'prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CategoryLimitsController],
  providers: [CategoryLimitsService]
})
export class CategoryLimitsModule {}
