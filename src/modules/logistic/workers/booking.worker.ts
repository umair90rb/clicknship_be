import { PrismaClient } from '@/prisma/tenant/client';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { tenantWithPrefix } from '@/src/utils/tenant';
import { CreateBookingJobData } from '../types';
import { getDbUrl } from '../../onboard/utils';
import { CREATE_BOOKING_QUEUE } from '../constants';

@Processor(CREATE_BOOKING_QUEUE, {})
export class CreateBookingQueueConsumer extends WorkerHost {
  private prismaTenantConnection: PrismaClient = null;
  private readonly logger = new Logger(CreateBookingQueueConsumer.name);

  constructor() {
    super();
    this.prismaTenantConnection = null;
  }

  async openTenantDbConnection(tenantId: string) {
    this.prismaTenantConnection = new PrismaClient({
      datasourceUrl: getDbUrl(tenantWithPrefix(tenantId)),
    });

    await this.prismaTenantConnection.$connect();
    return this.prismaTenantConnection;
  }

  async process(job: Job, token?: string): Promise<any> {
    const { user, tenant, orderIds, courierId }: CreateBookingJobData =
      job.data;
    await this.openTenantDbConnection(tenant.tenantId);
    this.logger.log(job.data);
    const courier = await this.prismaTenantConnection.courierService.findFirst({
      where: { id: courierId },
      select: {
        courierServiceFields: true,
      },
    });
    if (!courier) {
      return this.logger.error(`Courier service with ${courierId} not found!`);
    }
    this.logger.log(courier);
    const orders = await this.prismaTenantConnection.order.findMany({
      where: { id: { in: orderIds } },
    });
    if (!orders || !orders.length) {
      return this.logger.warn(
        `No order found for booking, searching for orderIds ${orderIds}`,
      );
    }
    this.logger.log(orders);
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    Logger.log(`Job with id ${job.id} from ${CREATE_BOOKING_QUEUE} is started`);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${CREATE_BOOKING_QUEUE} is completed`,
    );
    await this.prismaTenantConnection.$disconnect();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job) {
    await this.prismaTenantConnection.$disconnect();
    Logger.log(
      `Job with id ${job.id} from ${CREATE_BOOKING_QUEUE} is failed due to ${job.failedReason}`,
    );
  }
}
