import { PrismaClient } from '@/prisma/tenant/client';
import { WEBHOOK_ORDER_CREATE_QUEUE } from '@/src/constants/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { extractKeysFromObj, formatPhoneNumber } from './utils';
import { ADDRESS_DATA_KEYS, ADDRESS_DATA_KEYS_FROM_NOTES, CUSTOMER_DATA_KEYS, CUSTOMER_DATA_KEYS_FROM_NOTES, ITEM_DATA_KEYS, ORDER_DATA_KEYS, } from './order-data-keys';
import { OrderData } from '../order/order.types';
import { CreateOrderJobData } from './order.types';

@Processor(WEBHOOK_ORDER_CREATE_QUEUE)
export class WebhookOrderCreateConsumer extends WorkerHost {
  async process(job: Job, token?: string): Promise<any> {
    const { tenantId, eventId, logId, payload, domain }: CreateOrderJobData = job.data;
    const prismaTenantConnection = new PrismaClient({
      datasourceUrl: `${process.env.TENANT_DATABASE_SERVER_URL}/${tenantId}`
    });

    await prismaTenantConnection.$connect();

    const webhookLog = await prismaTenantConnection.shopifyWebhookLog.findFirst({
      where: {
        AND: [
          { eventId },
          {
            NOT: {
              id: logId
            }
          }
        ]
      }
    })

    // mark order as duplicate based on webhook event id. if event id is duplcated mean same order received twice from shopify webhook
    if (webhookLog) {
      await prismaTenantConnection.shopifyWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: 'duplicate'
        }
      });
      return;
    }

    let chanel: { id: number, brandId: number } | null = await prismaTenantConnection.channel.findFirst({
      where: {
        source: domain
      },
      select: { id: true, brandId: true }
    });

    //create received order in db
    const orderData = extractKeysFromObj(payload, ORDER_DATA_KEYS);
    let adderssData = extractKeysFromObj(payload?.shipping_address, ADDRESS_DATA_KEYS);
    let customerData = extractKeysFromObj(payload?.customer, CUSTOMER_DATA_KEYS);

    const notesAttributes = payload?.note_attributes?.reduce(
      (pv, { name, value }) => ({
        [name.toLowerCase().replaceAll(' ', '_')]: value,
        ...pv,
      }),
      {}
    );


    if (!customerData || !Object.keys(customerData).length) {
      const customerDataFromNotes = extractKeysFromObj(
        notesAttributes,
        CUSTOMER_DATA_KEYS_FROM_NOTES
      );
      customerData = {
        first_name: customerDataFromNotes?.full_name,
        ...customerDataFromNotes,
      };
    }

    if (!adderssData || !Object.keys(adderssData).length) {
      const addressDataFromNotes = extractKeysFromObj(
        notesAttributes,
        ADDRESS_DATA_KEYS_FROM_NOTES
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

    let customer: { id: number } = await prismaTenantConnection.customer.findFirst({
      where: { phone: customerData.phone },
      select: { id: true }
    })

    if (!customer) {
      customer = await prismaTenantConnection.customer.create({
        data: { name: `${customerData.first_name} ${customerData.last_name}`.trimEnd(), ...customerData },
        select: { id: true }
      })
    }

    let order: { id: number } = await prismaTenantConnection.order.create({
      data: { ...orderData, channelId: chanel?.id, brandId: chanel?.brandId, customerId: customer.id },
      select: { id: true }
    })

    await prismaTenantConnection.address.create({
      data: {
        ...adderssData,
        orderId: order.id
      },
      select: {}
    })

    const orderItemsData = payload.line_items.map((item) => ({
      ...extractKeysFromObj(item, ITEM_DATA_KEYS),
      orderId: order.id
    }));

    await prismaTenantConnection.orderItem.createMany({ data: orderItemsData })

    await prismaTenantConnection.orderLog.create({ data: { orderId: order.id, event: 'order received from shopify store via web hook' } })

    await prismaTenantConnection.shopifyWebhookLog.update({
      where: { id: logId }, data: {
        status: 'processed',
        processedAt: new Date(),

      }
    })

  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${WEBHOOK_ORDER_CREATE_QUEUE} is started`,
    );
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${WEBHOOK_ORDER_CREATE_QUEUE} is completed`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${WEBHOOK_ORDER_CREATE_QUEUE} is failed`,
    );
  }
}
