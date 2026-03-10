import { Controller, Post, UseInterceptors, UploadedFile, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('upload')
export class UploadController {
  @Post()
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  // Se o erro persistir, você pode usar ': any' temporariamente, 
  // mas o ideal é 'Express.Multer.File' após instalar os tipos.
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Falha ao carregar arquivo');
    }
    
    // Retorna a URL para o frontend
    return { 
      url: `http://localhost:3001/uploads/${file.filename}` 
    };
  }
}