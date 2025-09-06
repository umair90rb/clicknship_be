import { DocumentBuilder } from '@nestjs/swagger';

export const config = new DocumentBuilder()
  .setTitle('Click N Ship')
  .setDescription('Multi tenant ecommerce order management system')
  .setVersion('1.0')
  .addTag('CNS')
  .build();
