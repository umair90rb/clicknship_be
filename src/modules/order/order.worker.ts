import { PrismaClient } from '@/prisma/tenant/client';
import { WEBHOOK_ORDER_CREATE_QUEUE } from '@/src/constants/common';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor(WEBHOOK_ORDER_CREATE_QUEUE)
export class WebhookOrderCreateConsumer extends WorkerHost {
  async process(job: Job, token?: string): Promise<any> {
    const { tenantId, eventId, logId } = job.data;
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

    if (webhookLog) {
      await prismaTenantConnection.shopifyWebhookLog.update({
        where: { id: webhookLog.id },
        data: {
          status: 'duplicate'
        }
      });
      return;
    }





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
