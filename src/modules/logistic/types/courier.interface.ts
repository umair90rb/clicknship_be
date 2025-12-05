interface Metadata {
  name: string;
  allowBulkBooking: boolean;
}

export interface IBaseCourierService {
  get getMetadata(): Metadata;
  bookParcel(orderDetails: any, deliveryAccount: any): Promise<any>;
  cancelBooking(cn: string, deliveryAccount: any): Promise<any>;
  checkParcelStatus(cn: string, deliveryAccount: any): Promise<any>;
  downloadReceipt(cns: string[], deliveryAccount: any): Promise<any>;
}

// src/modules/logistics/types/courier.interface.ts

export interface ICourierService extends IBaseCourierService {
  
  batchBookParcels?(orders: any[], deliveryAccount: any): Promise<any>;


  downloadLoadSheet?(
    loadSheetId: number,
    deliveryAccount: any,
    responseType?: 'PDF' | 'JSON',
  ): Promise<any>;

  /* ------------------- Leopard-Specific Full API Implementation ------------------- */


  generateLoadSheet?(
    cnNumbers: string[],
    deliveryAccount: any,
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
    deliveryAccount: any,
  ): Promise<any>;

  getAllBanks?(deliveryAccount: any): Promise<any>;

  createShipper?(payload: any, deliveryAccount: any): Promise<any>;

  getPaymentDetails?(
    cnNumbers: string[] | string,
    deliveryAccount: any,
  ): Promise<any>;

  getTariffDetails?(params: {
    packet_weight: number;
    shipment_type: number;
    origin_city: number | string;
    destination_city: number | string;
    cod_amount?: number;
    deliveryAccount: any;
  }): Promise<any>;

  getShippingCharges?(
    cnNumbers: string[] | string,
    deliveryAccount: any,
  ): Promise<any>;

  getShipperDetails?(
    requestParam: string,
    requestValue: string,
    deliveryAccount: any,
  ): Promise<any>;

  proofOfDelivery?(
    cnNumbers: string[] | string,
    deliveryAccount: any,
  ): Promise<any>;

  shipperAdviceList?(query: any, deliveryAccount: any): Promise<any>;

  updateShipperAdvice?(data: any[], deliveryAccount: any): Promise<any>;

  activityLog?(query: any, deliveryAccount: any): Promise<any>;

  getAllCities?(deliveryAccount: any): Promise<any>;
}
