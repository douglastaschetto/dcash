import { Module } from '@nestjs/common';
import { DreamsService } from './dreams.service';
import { DreamsController } from './dreams.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [DreamsController],
  providers: [DreamsService, 
    PrismaService,
  ],
})
export class DreamsModule {}