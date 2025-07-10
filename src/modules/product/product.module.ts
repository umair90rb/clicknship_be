import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';

@Module({
  controllers: [ProductController],
  providers: [ProductService, tenantConnectionProvider],
})
export class ProductModule {}
