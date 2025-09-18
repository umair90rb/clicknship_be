import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { WebhookOrderCreateConsumer } from '../webhook/order.worker';


@Module({
  controllers: [OrderController],
  providers: [OrderService, tenantConnectionProvider, WebhookOrderCreateConsumer],
})
export class OrderModule { }
