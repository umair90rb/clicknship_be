import { Injectable } from '@nestjs/common';
import { CourierFactory } from '../factories/courier.factory';

@Injectable()
export class BookingService {
  constructor(private readonly courierFactory: CourierFactory) {}

  async bookParcel(orderDetails, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.bookParcel(orderDetails, deliveryAccount);
  }

  async cancelBooking(cn, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.cancelBooking(cn, deliveryAccount);
  }

  async checkStatus(cn, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.checkParcelStatus(cn, deliveryAccount);
  }

  async downloadReceipts(cns, deliveryAccount) {
    const courier = this.courierFactory.getCourier(deliveryAccount.service);
    return courier.downloadReceipt(cns, deliveryAccount);
  }
}
