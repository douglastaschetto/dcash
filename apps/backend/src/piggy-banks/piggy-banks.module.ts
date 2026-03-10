import { Module } from '@nestjs/common';
import { PiggyBanksService } from './piggy-banks.service';
import { PiggyBanksController } from './piggy-banks.controller';
import { PrismaService } from 'prisma/prisma.service'; // Verifique se este caminho está correto no seu projeto

@Module({
  controllers: [PiggyBanksController],
  providers: [PiggyBanksService, PrismaService],
  exports: [PiggyBanksService], // Exportamos para que o DreamsModule possa usá-lo se necessário
})
export class PiggyBanksModule {}