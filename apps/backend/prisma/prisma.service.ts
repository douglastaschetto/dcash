import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    // Conecta ao Postgres da OCI ao iniciar o módulo
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}