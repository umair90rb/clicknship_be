import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { PrismaClient } from '@/prisma/tenant/client';
import { getDbUrl } from '../../onboard/utils';
import { ORDER_TRACKING_QUEUE, PAK_TIMEZONE, TRACKING_JOB } from '../constants';
import { OrderStatus } from '@/src/types/order';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { BOOKING_ACTIONS } from '../types';
import { ShipmentTrackingMetadata } from '@/prisma/master/client';

@Injectable()
export class OrderTrackingJob {
  private readonly logger = new Logger(OrderTrackingJob.name);
  private prismaTenantConnection: PrismaClient = null;

  constructor(
    private prismaMasterService: PrismaMasterClient,
    @InjectQueue(ORDER_TRACKING_QUEUE) private trackingQueue: Queue,
  ) {
    this.prismaTenantConnection = null;
  }

  @Cron(CronExpression.EVERY_10_SECONDS, {
    waitForCompletion: true,
    timeZone: PAK_TIMEZONE,
    name: TRACKING_JOB,
  })
  async handleCron() {
    // get 1 tenant whose order is not tracked
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 1) Find tenants that DO NOT have a record today
    const tenant = await this.prismaMasterService.tenant.findFirst({
      where: {
        trackingLogs: {
          none: {
            startedAt: {
              gte: start,
              lte: end,
            },
          },
        },
      },
    });

    if (!tenant) {
      this.logger.log('No tenant found for order tracking');
      return;
    }

    const { tenantId, dbName } = tenant;

    this.logger.log(`Tracking required for tenant: ${tenantId}`);
    await this.openTenantDbConnection(dbName);
    if (!this.prismaTenantConnection) {
      this.logger.error(`Error in connecting with tenant: ${tenantId} db`);
      return;
    }
    // get all of its orders that eligible to track
    // 1 those orders that are booked but not delivered, returned or in returning.
    // 2 all those orders that are not tracked today
    const shipments = await this.prismaTenantConnection.orderShipment.findMany({
      select: {
        cn: true,
        courierServiceId: true,
        orderId: true,
        id: true,
      },
      where: {
        OR: [
          {
            lastTrackedAt: { lte: start },
          },
          { lastTrackedAt: null },
        ],
        status: {
          notIn: [
            OrderStatus.delivered,
            OrderStatus.returned,
            OrderStatus.inReturnProcess,
          ],
        },
      },
    });

    if (!shipments.length) {
      this.logger.log(`No shipment found for tracking for tenant ${tenantId}`, );
      await this.addShipmentTrackingMetadata({
        noOfJobs: 0,
        noOfOrders: shipments.length,
        startedAt: new Date(),
        endedAt: new Date,
        tenantId: tenantId,
      });
      return;
    }
    // group them by courier
    const groupedByCourierServiceId = {};
    for (const shipment of shipments) {
      const { courierServiceId } = shipment;
      if (groupedByCourierServiceId[courierServiceId] === undefined) {
        groupedByCourierServiceId[courierServiceId] = [shipment];
      } else {
        groupedByCourierServiceId[courierServiceId].push(shipment);
      }
    }
    // put them into queue
    const courierServiceIdsArr = Object.keys(groupedByCourierServiceId);
    await this.trackingQueue.addBulk(
      courierServiceIdsArr.map((key) => ({
        name: BOOKING_ACTIONS.track,
        data: {
          courierServiceId: key,
          bookings: groupedByCourierServiceId[key],
          tenant,
        },
        opts: {
          jobId: `${BOOKING_ACTIONS.track}/${tenantId}/${key}/${Date.now()}`,
        },
      })),
    );
    await this.addShipmentTrackingMetadata({
      noOfJobs: courierServiceIdsArr.length,
      noOfOrders: shipments.length,
      startedAt: new Date(),
      tenantId: tenantId,
      endedAt: undefined
    });

    this.logger.log(
      `${courierServiceIdsArr.length} tracking jobs added for tenant: ${tenantId}, closing db connection...`,
    );
    await this.prismaTenantConnection.$disconnect();
    this.logger.log('db connection closed.');
  }

  private async addShipmentTrackingMetadata(data: Omit<ShipmentTrackingMetadata, 'id'>) {
    return this.prismaMasterService.shipmentTrackingMetadata.create({
      data,
    });
  }

  private async openTenantDbConnection(dbName: string) {
    this.prismaTenantConnection = new PrismaClient({
      datasourceUrl: getDbUrl(dbName),
    });

    await this.prismaTenantConnection.$connect();
    return this.prismaTenantConnection;
  }
}
