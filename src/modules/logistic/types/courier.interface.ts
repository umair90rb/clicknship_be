export interface Metadata {
  name: string;
  allowBulkBooking: boolean;
  allowBulkTracking: boolean;
}

export interface BookParcelResponse {
  cn: string;
  courierAccount: any;
  success: boolean;
  message: string;
  order: any;
  data: any;
}
interface BatchBookingData {
    cn: string;
    order: any;
  }
export interface BatchBookParcelResponse {
  success: boolean;
  courierAccount: any;
  message: string;
  bookings: BatchBookingData[];
}

export interface CancelParcelResponse {
  cn: string;
  courierAccount: any;
  success: boolean;
  message: string;
  data: any;
}

export interface TrackingEvent {
  status: string;
  date: Date;
  reason: string;
  receiver: string;
}

export interface ParcelStatusResponse {
  courierAccount: any;
  shipment: any;
  tracking: TrackingEvent[];
  cn: string;
  success: boolean;
  message: string;
}

export interface IBaseCourierService {
  get getMetadata(): Metadata;
  bookParcel(
    orderDetails: any,
    courierAccount: any,
  ): Promise<BookParcelResponse>;
  cancelBooking(
    shipment: string,
    courierAccount: any,
  ): Promise<CancelParcelResponse>;
  parcelStatus(
    shipment: any,
    courierAccount: any,
  ): Promise<ParcelStatusResponse>;
  batchParcelStatus?(
    shipments: any[],
    courierAccount: any,
  ): Promise<ParcelStatusResponse[]>;
  batchBookParcels?(
    orders: any[],
    courierAccount: any,
  ): Promise<BatchBookParcelResponse>;
}

// src/modules/logistics/types/courier.interface.ts

export interface ICourierService extends IBaseCourierService {
  downloadReceipt(cns: string[], courierAccount: any): Promise<any>;

  downloadLoadSheet?(
    loadSheetId: number,
    courierAccount: any,
    responseType?: 'PDF' | 'JSON',
  ): Promise<any>;

  generateLoadSheet?(
    cnNumbers: string[],
    courierAccount: any,
    courierName?: string,
    courierCode?: string,
  ): Promise<any>;

  getBookedPacketLastStatuses?(params: {
    fromDate?: string;
    toDate?: string;
    apiKey?: string;
    apiPassword?: string;
  }): Promise<any>;

  getShipmentDetailsByOrderIDs?(
    orderIds: string[] | string,
    courierAccount: any,
  ): Promise<any>;

  getAllBanks?(courierAccount: any): Promise<any>;

  createShipper?(payload: any, courierAccount: any): Promise<any>;

  getPaymentDetails?(
    cnNumbers: string[] | string,
    courierAccount: any,
  ): Promise<any>;

  getTariffDetails?(params: {
    packet_weight: number;
    shipment_type: number;
    origin_city: number | string;
    destination_city: number | string;
    cod_amount?: number;
    courierAccount: any;
  }): Promise<any>;

  getShippingCharges?(
    cnNumbers: string[] | string,
    courierAccount: any,
  ): Promise<any>;

  getShipperDetails?(
    requestParam: string,
    requestValue: string,
    courierAccount: any,
  ): Promise<any>;

  proofOfDelivery?(
    cnNumbers: string[] | string,
    courierAccount: any,
  ): Promise<any>;

  shipperAdviceList?(query: any, courierAccount: any): Promise<any>;

  updateShipperAdvice?(data: any[], courierAccount: any): Promise<any>;

  activityLog?(query: any, courierAccount: any): Promise<any>;

  getAllCities?(courierAccount: any): Promise<any>;
}
