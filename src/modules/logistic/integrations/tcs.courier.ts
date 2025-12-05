import { Injectable } from '@nestjs/common';
import { ICourierService } from '../types/courier.interface';

@Injectable()
export class TcsCourier implements ICourierService {
  private readonly metadata = {
    name: 'TcsCourier',
    allowBulkBooking: false
  }

  get getMetadata(){
    return this.metadata;
  }
  async bookParcel(order, account) {
    /* ... */
  }
  async cancelBooking(cn, account) {
    /* ... */
  }
  async checkParcelStatus(cn, account) {
    /* ... */
  }
  async downloadReceipt(cns, account) {
    /* ... */
  }
}
