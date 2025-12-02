import { Tenant } from '@/src/types/tenant';

export enum BOOKING_ACTIONS {
  create = 'booking/create',
}

export interface CreateBookingJobData {
  user: { id: number };
  tenant: Tenant;
  courierId: number;
  orderIds: number[];
}
