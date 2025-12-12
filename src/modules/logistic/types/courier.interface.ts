interface Metadata {
  name: string;
  allowBulkBooking: boolean;
}

interface BookParcelResponse {
  cn: string;
  success: boolean;
  message: string;
  order: any;
}

export interface IBaseCourierService {
  get getMetadata(): Metadata;
  bookParcel(orderDetails: any, courierAccount: any): Promise<any>;
  cancelBooking(cn: string, courierAccount: any): Promise<any>;
  checkParcelStatus(cn: string, courierAccount: any): Promise<any>;
  downloadReceipt(cns: string[], courierAccount: any): Promise<any>;
}

// src/modules/logistics/types/courier.interface.ts

export interface ICourierService extends IBaseCourierService {
  batchBookParcels?(orders: any[], courierAccount: any): Promise<any>;

  downloadLoadSheet?(
    loadSheetId: number,
    courierAccount: any,
    responseType?: 'PDF' | 'JSON',
  ): Promise<any>;

  /* ------------------- Leopard-Specific Full API Implementation ------------------- */

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
