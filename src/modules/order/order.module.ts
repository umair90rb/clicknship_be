import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';


@Module({
  controllers: [OrderController],
  providers: [OrderService, tenantConnectionProvider],
})
export class OrderModule { }
