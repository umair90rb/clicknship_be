import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DbConnectionCleanupInterceptor } from './interceptors/db-connection-cleanup.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new DbConnectionCleanupInterceptor());
  await app.listen(process.env.PORT);
}
bootstrap();
