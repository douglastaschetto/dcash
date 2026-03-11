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
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new Error('Falha ao carregar arquivo');
    }
    
    // IMPORTANTE: Em produção, o frontend acessa via /api/uploads/
    // O FRONTEND_URL aqui deve ser https://dcash.dtasc.com.br
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    
    return { 
      url: `${baseUrl}/api/uploads/${file.filename}` 
    };
  }
}