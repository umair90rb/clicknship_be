import { PrismaClient } from '@/prisma/tenant/client';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { tenantWithPrefix } from '@/src/utils/tenant';
import { CreateBookingJobData } from '../types';
import { getDbUrl } from '../../onboard/utils';
import { CREATE_BOOKING_QUEUE } from '../constants';
import { CourierFactory } from '../factories/courier.factory';
import { OrderStatus } from '@/src/types/order';

@Processor(CREATE_BOOKING_QUEUE, {})
export class CreateBookingQueueConsumer extends WorkerHost {
  private prismaTenantConnection: PrismaClient = null;
  private readonly logger = new Logger(CreateBookingQueueConsumer.name);

  constructor(private readonly courierFactory: CourierFactory) {
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
        id: true,
        name: true,
        courier: true,
        active: true,
        dispatchAddress: true,
        returnAddress: true,
        courierServiceFields: true,
      },
    });
    if (!courier) {
      return this.logger.error(`Courier service with ${courierId} not found!`);
    }
    this.logger.log(courier);
    const courierService = this.courierFactory.getCourier(courier.name);
    // const hasBulkBooking = courierService.getFeatures.allowBulkBooking;
    const hasBulkBooking = courier.courier === 'leopard'; // for dev
    this.logger.log(`Courier bulk booking feature`, courierService.getMetadata);
    const orders = await this.prismaTenantConnection.order.findMany({
      where: { id: { in: orderIds } },
    });
    if (!orders || !orders.length) {
      return this.logger.warn(
        `No order found for booking, searching for orderIds ${orderIds}`,
      );
    }
    this.logger.log('Orders from db', orders.length);
    const createdBookings = [],
      failedBookings = [];
    if (hasBulkBooking) {
      const bookingResponse = await courierService.batchBookParcels(
        orders,
        courier,
      );
      this.logger.log('booking service response', bookingResponse);
      for (const booking of bookingResponse) {
        if (booking.success) {
          createdBookings.push(booking);
        } else {
          failedBookings.push(booking);
        }
      }
    }
    if (createdBookings.length) {
      const orderIds = createdBookings.map((booking) => booking.order.id);
      await this.createBooking(createdBookings);
      await this.updateOrderStatus(orderIds, OrderStatus.booked);
      const logs = orderIds.map((orderId) => ({
        orderId,
        event: `order booked with ${courier?.courier} using account ${courier?.name}`,
        userId: user?.id,
      }));
      await this.createOrderLogs(logs);
    }
    if (failedBookings.length) {
      const orderIds = failedBookings.map((booking) => booking?.order?.id);
      await this.updateOrderStatus(orderIds, OrderStatus.bookingError);
      const logs = failedBookings.map((failedBooking) => ({
        event: `order booking failed with ${courier?.courier} using account ${courier?.name}, error -> ${failedBooking?.message}`,
        userId: user?.id,
        orderId: failedBooking?.order?.id,
      }));
      await this.createOrderLogs(logs);
    }
  }

  private async createBooking(orderBookings: any[]) {
    return this.prismaTenantConnection.orderDelivery.createMany({
      data: orderBookings.map((booking) => ({
        cn: booking?.cn,
        orderId: booking?.order?.id,
        courierServiceId: booking?.courierAccount?.id,
        courierServiceCompany: booking?.courierAccount?.courier,
        status: OrderStatus.booked,
      })),
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

  private async createOrderLogs(logs: any[]) {
    return this.prismaTenantConnection.orderLog.createMany({
      data: logs,
    });
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
