import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { join } from 'path';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { IoAdapter } from '@nestjs/platform-socket.io';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // WebSocket adapter (socket.io)
  app.useWebSocketAdapter(new IoAdapter(app));

  // CORS
  // .trim() defends against trailing newlines/whitespace sneaking into the
  // env var via copy-paste on hosting dashboards, which Node's HTTP layer
  // rejects outright ("Invalid character in header content").
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim();
  app.enableCors({
    origin: frontendUrl,
    credentials: true,
  });

  // Serve uploaded images as static files at /uploads/...
  const uploadsDir = join(process.cwd(), 'uploads');
  app.useStaticAssets(uploadsDir, { prefix: '/uploads' });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // API prefix (does not affect /uploads static route)
  app.setGlobalPrefix('api');

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Server running on http://localhost:${port}`);
}

bootstrap();
