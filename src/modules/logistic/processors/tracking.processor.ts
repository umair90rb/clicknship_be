import { PrismaClient } from '@/prisma/tenant/client';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TrackBookingJobData } from '../types';
import { getDbUrl } from '../../onboard/utils';
import { ORDER_TRACKING_QUEUE } from '../constants';
import { CourierFactory } from '../factories/courier.factory';
// import { OrderEvents, OrderStatus } from '@/src/types/order';
import { ParcelStatusResponse } from '../types/courier.interface';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { getTenantDbName } from '@/src/utils/tenant';

@Processor(ORDER_TRACKING_QUEUE, {})
export class TrackShipmentQueueConsumer extends WorkerHost {
  private prismaTenantConnection: PrismaClient = null;
  private readonly logger = new Logger(TrackShipmentQueueConsumer.name);

  constructor(
    private readonly courierFactory: CourierFactory,
    private readonly prismaMaster: PrismaMasterClient,
  ) {
    super();
    this.prismaTenantConnection = null;
  }

  async process(job: Job, token?: string): Promise<any> {
    const {
      tenant,
      shipments,
      courierServiceId,
      shipmentTrackingMetadataId,
    }: TrackBookingJobData = job.data;
    if (!shipments.length) {
      this.logger.log(`No booking to track for job: ${job.id}`);
      return;
    }
    await this.openTenantDbConnection(tenant.tenantId);
    this.logger.log(job.data);
    const courier = await this.getCourier(parseInt(courierServiceId));
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
    let trackingResponse: ParcelStatusResponse[] = [];
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

    for (const trackingDetail of trackingResponse) {
      const { success, cn, courierAccount, message, shipment, tracking } =
        trackingDetail;
      if (success) {
        await this.updateShipment(shipment.id, {
          lastTrackedAt: new Date(),
          trackingJson: tracking,
          status: tracking[0].status,
        });
      }
    }

    await this.prismaMaster.shipmentTrackingMetadata.update({
      where: { id: shipmentTrackingMetadataId },
      data: {
        endedAt: new Date(),
      },
    });
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

  private async updateShipment(id: number, data: any) {
    return this.prismaTenantConnection.orderShipment.update({
      where: { id },
      data,
    });
  }

  // private async updateOrderStatus(orderIds: any[], status: OrderStatus) {
  //   return this.prismaTenantConnection.order.updateMany({
  //     data: {
  //       status,
  //     },
  //     where: { id: { in: orderIds } },
  //   });
  // }

  // private async createOrderLogs(logs: any[]) {
  //   return this.prismaTenantConnection.orderLog.createMany({
  //     data: logs,
  //   });
  // }

  async openTenantDbConnection(tenantId: string) {
    this.prismaTenantConnection = new PrismaClient({
      datasourceUrl: getDbUrl(getTenantDbName(tenantId)),
    });

    await this.prismaTenantConnection.$connect();
    return this.prismaTenantConnection;
  }

  async closeTenantDbConnection() {
    if (this.prismaTenantConnection) {
      await this.prismaTenantConnection.$disconnect();
    }
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
    await this.closeTenantDbConnection();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job, error: Error) {
    Logger.log(
      `Job with id ${job.id} from ${ORDER_TRACKING_QUEUE} is failed due to ${job.failedReason}, ${error.stack}`,
    );
    await this.closeTenantDbConnection();
  }
}
