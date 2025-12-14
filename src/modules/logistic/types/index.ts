import { OrderShipment } from '@/prisma/tenant/client';
import { Tenant } from '@/src/types/tenant';

export enum BOOKING_ACTIONS {
  create = 'booking/create',
  track = 'booking/track',
}

export interface CreateBookingJobData {
  user: { id: number };
  tenant: Tenant;
  courierId: number;
  orderIds: number[];
}

export interface TrackBookingJobData {
  shipmentTrackingMetadataId: string;
  courierServiceId: string;
  shipments: Omit<
    OrderShipment,
    'tracking' | 'trackingAt' | 'trackingStatus' | 'status'
  >[];
  tenant: Tenant;
}
