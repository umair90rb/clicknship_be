import { Injectable } from '@nestjs/common';
import { CourierFactory } from '../factories/courier.factory';
import { RequestUser } from '@/src/types/auth';
import { CreateBookingDto } from '../dtos/booking.dto';

@Injectable()
export class BookingService {
  constructor(private readonly courierFactory: CourierFactory) {}

  async status(cn: string, user: RequestUser) {
    const deliveryAccount = { service: 'abc' }; //get delivery account
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.checkParcelStatus(cn, deliveryAccount);
  }

  async create(createBookingDto: CreateBookingDto) {
    // add booking to queue
  }

  async cancel(cns: string[]) {
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
