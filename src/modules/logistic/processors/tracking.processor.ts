import { PrismaClient } from '@/prisma/tenant/client';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TrackBookingJobData } from '../types';
import { getDbUrl } from '../../onboard/utils';
import { ORDER_TRACKING_QUEUE } from '../constants';
import { CourierFactory } from '../factories/courier.factory';
import { OrderEvents, OrderStatus } from '@/src/types/order';

@Processor(ORDER_TRACKING_QUEUE, {})
export class TrackBookingQueueConsumer extends WorkerHost {
  private prismaTenantConnection: PrismaClient = null;
  private readonly logger = new Logger(TrackBookingQueueConsumer.name);

  constructor(private readonly courierFactory: CourierFactory) {
    super();
    this.prismaTenantConnection = null;
  }

  async openTenantDbConnection(tenantId: string) {
    this.prismaTenantConnection = new PrismaClient({
      datasourceUrl: getDbUrl(tenantId),
    });

    await this.prismaTenantConnection.$connect();
    return this.prismaTenantConnection;
  }

  async process(job: Job, token?: string): Promise<any> {
    const {
      tenant,
      shipments,
      courierServiceId,
    }: TrackBookingJobData = job.data;
    if (!shipments.length) {
      this.logger.log(`No booking to track for job: ${job.id}`);
      return;
    }
    await this.openTenantDbConnection(tenant.dbName);
    this.logger.log(job.data);
    const courier = await this.getCourier(courierServiceId);
    if (!courier) {
      return this.logger.error(
        `Courier service with ${courierServiceId} not found!`,
      );
    }
    const courierService = this.courierFactory.getCourier(courier.name);
    // const hasBulkBooking = courierService.getFeatures.allowBulkBooking;
    const hasBulkTracking = courier.courier === 'leopard'; // for dev
    this.logger.log(
      `Courier bulk tracking feature`,
      courierService.getMetadata,
    );

    // tracking started
    let trackingResponse = [];
    if (hasBulkTracking) {
        trackingResponse = await courierService.batchParcelStatus(
          shipments,
          courier,
        );
      } else {
        trackingResponse = await Promise.all(
          shipments.map((shipment) =>
            courierService.parcelStatus(shipment, courier),
          ),
        );
      }
      
      let failedTracking = [], successTracking = [];
      for (const tracking of trackingResponse) {
        if (tracking.success) {
          successTracking.push(tracking);
        } else {
          failedTracking.push(tracking);
        }
      }
    
  }

  private async getCourier(courierId: number) {
    return this.prismaTenantConnection.courierService.findFirst({
      where: { id: courierId },
      select: {
        id: true,
        name: true,
        courier: true,
        active: true,
        dispatchAddress: true,
        returnAddress: true,
        courierServiceFields: true,
      },
    });
  }

  private async createBooking(orderBookings: any[]) {
    return this.prismaTenantConnection.orderShipment.createMany({
      data: orderBookings.map((booking) => ({
        cn: booking?.cn,
        orderId: booking?.order?.id,
        courierServiceId: booking?.courierAccount?.id,
        courierServiceCompany: booking?.courierAccount?.courier,
        status: OrderStatus.booked,
      })),
      skipDuplicates: true,
    });
  }

  private async updateOrderStatus(orderIds: any[], status: OrderStatus) {
    return this.prismaTenantConnection.order.updateMany({
      data: {
        status,
      },
      where: { id: { in: orderIds } },
    });
  }

  private async generateAndCreateOrderLogs(
    orderIds: any[],
    userId: number,
    event: string,
  ) {
    const logs = orderIds.map((orderId) => ({
      orderId,
      event,
      userId,
    }));
    await this.createOrderLogs(logs);
  }

  private async createOrderLogs(logs: any[]) {
    return this.prismaTenantConnection.orderLog.createMany({
      data: logs,
    });
  }

  @OnWorkerEvent('active')
  onActive(job: Job) {
    Logger.log(`Job with id ${job.id} from ${ORDER_TRACKING_QUEUE} is started`);
  }

  @OnWorkerEvent('completed')
  async onCompleted(job: Job) {
    Logger.log(
      `Job with id ${job.id} from ${ORDER_TRACKING_QUEUE} is completed`,
    );
    await this.prismaTenantConnection.$disconnect();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job) {
    await this.prismaTenantConnection.$disconnect();
    Logger.log(
      `Job with id ${job.id} from ${ORDER_TRACKING_QUEUE} is failed due to ${job.failedReason}`,
    );
  }
}
