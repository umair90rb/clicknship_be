import { Injectable } from '@nestjs/common';
import { CourierFactory } from '../factories/courier.factory';
import { RequestWithTenantAndUser } from '@/src/types/auth';
import { CreateBookingDto } from '../dtos/booking.dto';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { OrderService } from '../../order/services/order.service';
import { OrderStatus } from '@/src/types/order';
import { CREATE_BOOKING_QUEUE } from '../constants';
import { BOOKING_ACTIONS } from '../types';

@Injectable()
export class BookingService {
  constructor(
    private readonly courierFactory: CourierFactory,
    @InjectQueue(CREATE_BOOKING_QUEUE) private bookingQueue: Queue,
    private readonly orderService: OrderService,
  ) {}

  async status(cn: string, req: RequestWithTenantAndUser) {
    const deliveryAccount = { service: 'abc' }; //get delivery account
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.checkParcelStatus(cn, deliveryAccount);
  }

  async create(
    createBookingDto: CreateBookingDto,
    req: RequestWithTenantAndUser,
  ) {
    const { orderIds, courierId } = createBookingDto;
    console.log(orderIds, courierId, req.user, req.tenant);
    // update order status from confirmed -> booking queue
    await this.orderService.updateStatus(
      req.user,
      orderIds,
      OrderStatus.inBookingQueue,
    );
    // add relevant data to redis queue
    await this.bookingQueue.add(BOOKING_ACTIONS.create, {
      user: req.user,
      tenant: req.tenant,
      orderIds,
      courierId,
    });
    return { message: 'Order(s) added to booking queue', success: true };
  }

  async cancel(cns: string[], req: RequestWithTenantAndUser) {
    const deliveryAccount = { service: 'abc' }; //get delivery account
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.cancelBooking(cns[0], deliveryAccount);
  }

  async downloadReceipt(cns, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.downloadReceipt(cns, deliveryAccount);
  }

  async getShipperAdvice(cn, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.downloadReceipt(cn, deliveryAccount);
  }

  async addShipperAdvice(cns, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.downloadReceipt(cns, deliveryAccount);
  }
}
