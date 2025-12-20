import { PrismaClient } from '@/prisma/tenant/client';
import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CreateBookingJobData } from '../types';
import { getDbUrl } from '../../onboard/utils';
import { CREATE_BOOKING_QUEUE } from '../constants';
import { CourierFactory } from '../factories/courier.factory';
import { OrderEvents, OrderStatus } from '@/src/types/order';
import {
  BatchBookParcelResponse,
  BookParcelResponse,
} from '../types/courier.interface';

@Processor(CREATE_BOOKING_QUEUE, {})
export class CreateBookingQueueConsumer extends WorkerHost {
  private prismaTenantConnection: PrismaClient = null;
  private readonly logger = new Logger(CreateBookingQueueConsumer.name);

  constructor(private readonly courierFactory: CourierFactory) {
    super();
    this.prismaTenantConnection = null;
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
  async onFailed(job: Job, error: Error) {
    await this.prismaTenantConnection.$disconnect();
    Logger.log(
      `Job with id ${job.id} from ${CREATE_BOOKING_QUEUE} is failed due to ${job.failedReason}, ${error.stack}`,
    );
  }

  async process(job: Job, token?: string): Promise<any> {
    const { user, tenant, orderIds, courierId }: CreateBookingJobData =
      job.data;
    await this.openTenantDbConnection(tenant.dbName);
    this.logger.log(job.data);
    const courier = await this.getCourier(courierId);
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
    this.logger.log('Orders from db', orders.length);
    if (!orders || !orders.length) {
      return this.logger.warn(
        `No order found for booking, searching for orderIds ${orderIds}`,
      );
    }
    const alreadyBookedOrders = [],
      notBookedOrders = [];
    for (const order of orders) {
      if (order.status === OrderStatus.booked) {
        alreadyBookedOrders.push(order);
      } else {
        notBookedOrders.push(order);
      }
    }
    // booking started
    const createdBookings = [],
      failedBookings = [];
    if (notBookedOrders.length) {
      if (hasBulkBooking) {
        const batchBookingResponse: BatchBookParcelResponse =
          await courierService.batchBookParcels(notBookedOrders, courier);
        if (batchBookingResponse.success) {
          batchBookingResponse.bookings.map((booking) =>
            createdBookings.push({
              cn: booking.cn,
              order: booking.order,
              courierServiceId: batchBookingResponse?.courierAccount?.id,
              status: OrderStatus.booked,
            }),
          );
        }
      } else {
        const bookingResponses: BookParcelResponse[] = await Promise.all(
          notBookedOrders.map((order) =>
            courierService.bookParcel(order, courier),
          ),
        );
        for (const booking of bookingResponses) {
          if (booking.success) {
            createdBookings.push(booking);
          } else {
            failedBookings.push(booking);
          }
        }
      }
    }

    if (createdBookings.length) {
      const orderIds = createdBookings.map((booking) => booking.order.id);
      await this.createBooking(createdBookings);
      await this.updateOrderStatus(orderIds, OrderStatus.booked);
      await this.generateAndCreateOrderLogs(
        orderIds,
        user.id,
        OrderEvents.booked
          .replace('{courier}', courier.courier)
          .replace('{account}', courier.name),
      );
    }

    if (failedBookings.length) {
      const orderIds = failedBookings.map((booking) => booking?.order?.id);
      await this.updateOrderStatus(orderIds, OrderStatus.bookingError);
      const logs = failedBookings.map((failedBooking) => ({
        event: OrderEvents.bookingFailed
          .replace('{courier}', courier.courier)
          .replace('{account}', courier.name)
          .replace('{error}', failedBooking?.message),
        userId: user?.id,
        orderId: failedBooking?.order?.id,
      }));
      await this.createOrderLogs(logs);
    }

    if (alreadyBookedOrders.length) {
      const orderIds = alreadyBookedOrders.map((order) => order.id);
      await this.generateAndCreateOrderLogs(
        orderIds,
        user.id,
        OrderEvents.bookingStopped
          .replace('{courier}', courier.courier)
          .replace('{account}', courier.name),
      );
    }
  }

  private async openTenantDbConnection(dbName: string) {
    this.prismaTenantConnection = new PrismaClient({
      datasourceUrl: getDbUrl(dbName),
    });

    await this.prismaTenantConnection.$connect();
    return this.prismaTenantConnection;
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
}
