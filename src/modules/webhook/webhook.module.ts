import { Module } from '@nestjs/common';
import { ShopifyController } from './shopify.controller';
import { ShopifyService } from './shopify.service';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { BullModule } from '@nestjs/bullmq';
import { WEBHOOK_ORDER_CREATE_QUEUE } from '@/src/constants/common';

@Module({
    imports: [
        BullModule.registerQueue({
            name: WEBHOOK_ORDER_CREATE_QUEUE,
            defaultJobOptions: {
                removeOnComplete: true,
                removeOnFail: true
            }
        }),
    ],
    providers: [ShopifyService, tenantConnectionProvider],
    controllers: [ShopifyController]
})
export class WebhookModule {

}
