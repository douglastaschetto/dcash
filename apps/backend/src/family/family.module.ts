import { Module } from '@nestjs/common';
import { FamilyController } from './family.controller';
import { PrismaModule } from 'prisma/prisma.module';
import { FamilyService } from './family.service';
import { PrismaService } from 'prisma/prisma.service';

@Module({
  controllers: [FamilyController],
  providers: [FamilyService, PrismaService], // O FamilyService PRECISA estar aqui
  exports: [FamilyService], // Opcional: exporte se outros módulos forem usar
})
export class FamilyModule {}