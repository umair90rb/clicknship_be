import { Module } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { BullModule } from '@nestjs/bullmq';
import { WEBHOOK_ORDER_CREATE_QUEUE } from '@/src/constants/common';
import { WebhookOrderCreateConsumer } from './order.worker';

@Module({
    imports: [
        BullModule.registerQueue({
            name: WEBHOOK_ORDER_CREATE_QUEUE,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: true,
                attempts: 3,
                delay: 2000
            }
        }),
    ],
    providers: [ShopifyService, tenantConnectionProvider, WebhookOrderCreateConsumer],
    controllers: [ShopifyController]
})
export class WebhookModule {

}
