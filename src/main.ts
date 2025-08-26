import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionFilter } from './filters/all-exception.filter';
import { DbConnectionCleanupInterceptor } from './interceptors/db-connection-cleanup.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('/api/v1');
  app.useGlobalPipes(new ValidationPipe({ forbidNonWhitelisted: true }));
  app.useGlobalInterceptors(new DbConnectionCleanupInterceptor());
  app.useGlobalFilters(new AllExceptionFilter());
  app.enableCors();
  await app.listen(process.env.PORT);
}
bootstrap();
