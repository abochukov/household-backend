import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import session from 'express-session';
import * as cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  console.log('🚀 NestJS backend starting...');

  // Позволяваме cookies между Angular и Nest
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  app.use(
    session({
      name: 'sid',
      secret: 'very-secret-key',
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,     // JS няма достъп
        secure: false,      // true при HTTPS
        sameSite: 'lax',
        maxAge: 1000 * 60 * 60, // 1 час
      },
    }),
  );

  await app.listen(3000);
  console.log('✅ Backend is running on http://localhost:3000');
}
bootstrap();
