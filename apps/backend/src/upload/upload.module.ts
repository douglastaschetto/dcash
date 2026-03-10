import { Module } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
  providers: [],
})
export class UploadModule {}