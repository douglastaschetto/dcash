import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController } from './challenges.controller';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [ChallengesController], // O Controller deve estar aqui
  providers: [ChallengesService, PrismaService], // O Service e Prisma aqui
})
export class ChallengesModule {}