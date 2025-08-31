import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { WEBHOOK_ORDER_PROCESSOR_QUEUE } from 'src/constants/common';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';

@Module({
  imports: [
    BullModule.registerQueue({
      name: WEBHOOK_ORDER_PROCESSOR_QUEUE,
    }),
  ],
  controllers: [OrderController, ShopifyController],
  providers: [OrderService, ShopifyService, tenantConnectionProvider],
})
export class OrderModule {}
