import {
  PrismaClient as PrismaTenantClient,
  ShopifyWebhookLog,
} from '@/prisma/tenant/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import {
  SHOPIFY_TOPICS,
  TENANT_CONNECTION_PROVIDER,
  WEBHOOK_ORDER_CREATE_QUEUE,
} from 'src/constants/common';
import { OrderStatus } from 'src/types/order';
import { Tenant } from 'src/types/tenant';
import { OrderData } from './order.types';

@Injectable()
export class ShopifyService {
  private readonly logger = new Logger(ShopifyService.name);
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    @InjectQueue(WEBHOOK_ORDER_CREATE_QUEUE)
    private webhookOrderQueue: Queue,
  ) {}

  async createShopifyOrder(tenant: Tenant, headers: Headers, body: OrderData) {
    // this is required for production
    // const hmac = headers['x-shopify-hmac-sha256'] as string;
    // const isValid = this.validateWebhookRequest(tenant.tenantId, hmac, body);
    // if (!isValid) {
    //   throw new Error('Validation error! hmac did not match');
    // }
    const shopDomain = headers['x-shopify-shop-domain'] as string;
    const topic = headers['x-shopify-topic'] as string;
    const apiVersion = headers['x-shopify-api-version'] as string;
    const webhookId = headers['x-shopify-webhook-id'] as string;
    const triggeredAt = headers['x-shopify-triggered-at'] as string;
    const eventId = headers['x-shopify-event-id'] as string;

    const payload = body;
    const orderId = `#${payload.order_number.toString()}`;
    const totalItemsQuantity = payload.line_items.reduce(
      (sum, item) => sum + item.quantity,
      0,
    );
    const amount = parseFloat(payload.total_price);

    try {
      // 2. Save the webhook data to the database
      const logEntry: ShopifyWebhookLog =
        await this.prismaTenant.shopifyWebhookLog.create({
          data: {
            eventId: eventId,
            webhookId: webhookId,
            identifier: orderId, // Using order ID as identifier
            domain: shopDomain,
            topic: topic,
            apiVersion: apiVersion,
            triggeredAt: new Date(triggeredAt),
            receivedAt: new Date(),
            status: OrderStatus.received,
            payload: body as any,
            retries: 0,
            itemQuantity: totalItemsQuantity,
            amount: amount,
          },
        });

      this.logger.log(
        `Webhook '${webhookId}' for order '${orderId}' received and logged.`,
      );

      // 3. Add a job to the queue for processing
      await this.webhookOrderQueue.add(
        SHOPIFY_TOPICS.order.create,
        {
          webhookId: logEntry.id,
          orderId: orderId,
          domain: shopDomain,
          payload: body,
        },
        { jobId: webhookId }, // Use webhookId to ensure idempotency
      );

      this.logger.log(`Job for webhook '${webhookId}' added to queue.`);
    } catch (error) {
      this.logger.error(
        `Failed to process webhook '${webhookId}':`,
        error.message,
      );
      // Log the error and potentially re-throw or handle as needed
      throw error;
    }
  }

  validateWebhookRequest(tenantId: string, hmac: string, body: any) {
    // This validation implementation is crucial for production ready app
    // TODO: get store secret from db
    const sharedSecret = 'YOUR_SHOPIFY_WEBHOOK_SECRET';
    const bodyString = JSON.stringify(body);
    // 1. Validate the webhook
    const generatedHash = crypto
      .createHmac('sha256', sharedSecret)
      .update(Buffer.from(bodyString, 'utf-8'))
      .digest('base64');
    if (generatedHash !== hmac) {
      this.logger.error('Webhook validation failed. Invalid HMAC.');
      return false;
    }
    return true;
  }
}
