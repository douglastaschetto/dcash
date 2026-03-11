import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.set('trust proxy', 1);
  // 1. VITAL: Confia nos cabeçalhos do Nginx (X-Forwarded-Proto, etc.)
  // Isso impede que o app gere URLs com "localhost" ou "http" em vez de "https"
  app.getHttpAdapter().getInstance().set('trust proxy', true);

  // 2. Ajuste o CORS para o domínio real e o localhost
  app.enableCors({
    origin: [
      'https://dcash.dtasc.com.br', // Seu domínio oficial
      'http://localhost:3000'       // Para testes locais
    ],
    credentials: true,
  });

  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true, 
    transform: true,
    forbidNonWhitelisted: true 
  }));

  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });
  
  const port = 3001;
  await app.listen(port);
  console.log(`🚀 Backend Dcash rodando em: https://dcash.dtasc.com.br/api (Porta ${port})`);
}
bootstrap();