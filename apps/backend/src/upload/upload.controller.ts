import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { join } from 'path';

/** Only raster images; the extension comes from the validated type, never from the client file name. */
const IMAGE_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};
import { randomUUID } from 'crypto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'public', 'uploads'),
        filename: (_req, file, cb) => {
          cb(null, `${randomUUID()}${IMAGE_EXT[file.mimetype] ?? '.bin'}`);
        },
      }),
      fileFilter: (_req, file, cb) => {
        if (!IMAGE_EXT[file.mimetype]) {
          cb(
            new BadRequestException('Envie uma imagem JPG, PNG, WEBP ou GIF.'),
            false,
          );
          return;
        }
        cb(null, true);
      },
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  uploadFile(
    @UploadedFile() file: { filename: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('Nenhum arquivo enviado.');
    const base = process.env.API_URL || 'http://localhost:3001';
    return { url: `${base}/uploads/${file.filename}` };
  }
}
