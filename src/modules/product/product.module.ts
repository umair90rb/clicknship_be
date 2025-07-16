import { Module } from '@nestjs/common';
import { ProductService } from './product.service';
import { ProductController } from './product.controller';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ProductController],
  providers: [ProductService, tenantConnectionProvider],
})
export class ProductModule {}
