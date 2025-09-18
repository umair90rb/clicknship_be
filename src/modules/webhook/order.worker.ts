import { PrismaClient } from '@/prisma/tenant/client';
import { WEBHOOK_ORDER_CREATE_QUEUE } from '@/src/constants/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, tryCatch } from 'bullmq';
import {
  extractKeysFromObj,
  formatPhoneNumber,
  underscoreToCamelcase,
} from './utils';
import {
  ADDRESS_DATA_KEYS,
  ADDRESS_DATA_KEYS_FROM_NOTES,
  CUSTOMER_DATA_KEYS,
  CUSTOMER_DATA_KEYS_FROM_NOTES,
  ITEM_DATA_KEYS,
  ORDER_DATA_KEYS,
} from './order-data-keys';
import { OrderData } from '../order/order.types';
import { CreateOrderJobData } from './order.types';
import { tenantWithPrefix } from '@/src/utils/tenant';

@Processor(WEBHOOK_ORDER_CREATE_QUEUE, {})
export class WebhookOrderCreateConsumer extends WorkerHost {
  private prismaTenantConnection: PrismaClient = null;

  constructor() {
    super();
    this.prismaTenantConnection = null;
  }

  async openTenantDbConnection(tenantId: string) {
    this.prismaTenantConnection = new PrismaClient({
      datasourceUrl: `${process.env.TENANT_DATABASE_SERVER_URL}/${tenantWithPrefix(tenantId)}`,
    });

    await this.prismaTenantConnection.$connect();
    return this.prismaTenantConnection;
  }

  async process(job: Job, token?: string): Promise<any> {
    const { tenantId, eventId, logId, payload, domain }: CreateOrderJobData =
      job.data;
    await this.openTenantDbConnection(tenantId);
    const webhookLog =
      await this.prismaTenantConnection.shopifyWebhookLog.findFirst({
        where: {
          AND: [
            { eventId },
            {
              NOT: {
                id: logId,
              },
            },
          ],
        },
      });

    // mark order as duplicate based on webhook event id. if event id is duplcated mean same order received twice from shopify webhook
    // if (webhookLog) {
    //   await this.prismaTenantConnection.shopifyWebhookLog.update({
    //     where: { id: webhookLog.id },
    //     data: {
    //       status: 'duplicate'
    //     }
    //   });
    //   return;
    // }

    let chanel: { id: number; brandId: number } | null =
      await this.prismaTenantConnection.channel.findFirst({
        where: {
          source: domain,
        },
        select: { id: true, brandId: true },
      });

    //create received order in db
    const orderData = extractKeysFromObj(payload, ORDER_DATA_KEYS);
    let adderssData = extractKeysFromObj(
      payload?.shipping_address,
      ADDRESS_DATA_KEYS,
    );
    let customerData = extractKeysFromObj(
      payload?.customer,
      CUSTOMER_DATA_KEYS,
    );

    const notesAttributes = payload?.note_attributes?.reduce(
      (pv, { name, value }) => ({
        [name.toLowerCase().replaceAll(' ', '_')]: value,
        ...pv,
      }),
      {},
    );

    if (!customerData || !Object.keys(customerData).length) {
      const customerDataFromNotes = extractKeysFromObj(
        notesAttributes,
        CUSTOMER_DATA_KEYS_FROM_NOTES,
      );
      customerData = {
        first_name: customerDataFromNotes?.full_name,
        ...customerDataFromNotes,
      };
      delete customerData.full_name;
    }

    if (!adderssData || !Object.keys(adderssData).length) {
      const addressDataFromNotes = extractKeysFromObj(
        notesAttributes,
        ADDRESS_DATA_KEYS_FROM_NOTES,
      );
      adderssData = {
        address1: addressDataFromNotes?.address,
        ...addressDataFromNotes,
      };
    }

    if (Boolean(customerData?.phone)) {
      customerData['phone'] = formatPhoneNumber(customerData?.phone);
    } else if (Boolean(adderssData?.phone)) {
      customerData['phone'] = formatPhoneNumber(adderssData?.phone);
    } else if (Boolean(adderssData?.phone)) {
      customerData['phone'] = formatPhoneNumber(adderssData?.phone);
    }

    let customer: { id: number } =
      await this.prismaTenantConnection.customer.findFirst({
        where: { phone: customerData.phone },
        select: { id: true },
      });

    if (!customer) {
      customer = await this.prismaTenantConnection.customer.create({
        data: {
          name: `${customerData.first_name} ${customerData.last_name}`.trimEnd(),
          email: customerData?.email,
          phone: customerData?.phone,
        },
        select: { id: true },
      });
    }

    let order: { id: number } = await this.prismaTenantConnection.order.create({
      data: {
        orderNumber: orderData?.name,
        totalAmount: parseFloat(orderData?.total_price),
        totalTax: parseFloat(orderData?.total_tax),
        totalDiscount: orderData?.total_discount,
        createdAt: new Date(),
        channelId: chanel?.id,
        brandId: chanel?.brandId,
        customerId: customer?.id,
      },
      select: { id: true },
    });

    await this.prismaTenantConnection.address.create({
      data: {
        address: adderssData?.address1,
        note: adderssData?.address2,
        city: adderssData?.city,
        phone: adderssData?.phone,
        orderId: order.id,
        province: adderssData?.province,
        zip: adderssData?.zip,
        latitude: adderssData?.latitude,
        longitude: adderssData?.longitude,
      },
    });

    const orderItemsData = payload.line_items.map((item) => {
      const itemData = extractKeysFromObj(item, ITEM_DATA_KEYS);
      return {
        name: itemData?.name,
        unitPrice: parseFloat(itemData?.price),
        grams: itemData?.grams,
        quantity: itemData?.quantity,
        discount: itemData?.discount,
        sku: itemData?.sku,
        productId: itemData?.productId,
        variantId: itemData?.variantId,
        orderId: order?.id,
      };
    });

    await this.prismaTenantConnection.orderItem.createMany({
      data: orderItemsData,
    });

    await this.prismaTenantConnection.orderLog.create({
      data: {
        orderId: order.id,
        event: 'order received from shopify store via web hook',
      },
    });

    await this.prismaTenantConnection.shopifyWebhookLog.update({
      where: { id: logId },
      data: {
        status: 'processed',
        processedAt: new Date(),
      },
    });
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${WEBHOOK_ORDER_CREATE_QUEUE} is started`,
    );
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${WEBHOOK_ORDER_CREATE_QUEUE} is completed`,
    );
    await this.prismaTenantConnection.$disconnect();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job) {
    const { logId }: CreateOrderJobData = job.data;
    await this.prismaTenantConnection.shopifyWebhookLog.update({
      where: { id: logId },
      data: {
        status: 'failed',
        error: job.failedReason,
        processedAt: new Date(),
      },
    });
    await this.prismaTenantConnection.$disconnect();
    Logger.log(
      `Job with id ${job.id} from ${WEBHOOK_ORDER_CREATE_QUEUE} is failed due to ${job.failedReason}`,
    );
  }
}
