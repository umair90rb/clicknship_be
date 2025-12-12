// src/modules/logistics/integrations/leopard/index.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface'; // per your path

type LeopardResponse<T = any> = {
  status?: number | string | boolean;
  error?: any;
  [k: string]: any;
};

@Injectable()
export class LeopardCourier implements ICourierService {
  private readonly logger = new Logger(LeopardCourier.name);
  private readonly baseUrl: string;
  private readonly metadata = {
    name: 'LeopardCourier',
    allowBulkBooking: false,
  };

  get getMetadata() {
    return this.metadata;
  }

  /**
   * @param http HttpService from @nestjs/axios (injected)
   * @param baseUrl optional override for Leopard base url. If not provided it defaults to Leopard merchant api (production from legacy code).
   */
  constructor(
    private readonly http: HttpService,
    @Inject('LEOPARD_BASE_URL') baseUrl?: string,
  ) {
    // default to production endpoint used in the legacy integration
    this.baseUrl = baseUrl || 'https://merchantapi.leopardscourier.com/api/';
  }

  // ---------- Helper methods ----------
  private async post<T = any>(
    endpoint: string,
    body: any,
    opts: { responseType?: 'json' | 'arraybuffer' } = { responseType: 'json' },
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    try {
      this.logger.debug(`POST ${url} - body: ${JSON.stringify(body)}`);
      const obs = this.http.post<T>(url, body, {
        responseType:
          opts.responseType === 'arraybuffer' ? 'arraybuffer' : 'json',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return await firstValueFrom(obs);
    } catch (err) {
      this.logger.error(`HTTP POST error: ${url}`, err?.response?.data || err);
      // rethrow so callers can catch and normalize
      throw err;
    }
  }

  private normalizeLeopardResponse(resp: LeopardResponse) {
    // Leopard returns { status: 1|0, error: ... } - normalize to boolean isSuccess
    const status = resp?.status;
    const isSuccess = Boolean(Number(status));
    return {
      isSuccess,
      raw: resp,
      error: resp?.error ?? null,
    };
  }

  // ---------- Implemented endpoints ----------
  /**
   * Book single packet.
   * Mirrors legacy behavior: posts to bookPacket/format/json.
   * @param order object containing order data (format you use in clicknship)
   * @param courierAccount { key, password, cost_center, dispatch_address, return_address, service, ... }
   */
  async bookParcel(order: any, courierAccount: any) {
    let body: any;
    let response;
    try {
      // NOTE: user requested to skip DB lookups; consumer must provide destination_city id if required.
      body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        booked_packet_weight: order.weightInGrams ?? 250,
        booked_packet_no_piece: order.pieces ?? 1,
        booked_packet_collect_amount: order.total_price ?? 0,
        booked_packet_order_id: order.order_number
          ? `${order.order_number}`
          : null,
        origin_city: courierAccount.cost_center || 'self',
        destination_city:
          order.destination_city || order.address?.city || 'self',
        shipment_id: null,
        shipment_name_eng: courierAccount.shipment_name || 'Sukooon Wellness',
        shipment_email: courierAccount.shipment_email || undefined,
        shipment_phone: courierAccount.shipment_phone || undefined,
        shipment_address: courierAccount.dispatch_address || undefined,
        consignment_name_eng:
          `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim(),
        consignment_phone: order.customer?.phone
          ? `0${order.customer.phone}`
          : undefined,
        consignment_address:
          `${order.address?.address1 || ''} ${order.address?.city || ''}`.trim(),
        special_instructions: Array.isArray(order.items)
          ? order.items.map((it) => `${it.name}/${it.quantity}`).join(' - ')
          : order.special_instructions || '',
        shipment_type: order.shipment_type || 'overnight',
        return_address: courierAccount.return_address || '',
        return_city: courierAccount.cost_center || 'self',
      };

      response = await this.post<LeopardResponse>(
        'bookPacket/format/json',
        body,
      );
      this.logger.log('leopard bookParcel response', response.data);

      const { track_number, slip_link, status, error } = response.data || {};
      return {
        cn: track_number ?? null,
        slip: slip_link ?? null,
        isSuccess: Boolean(Number(status)),
        error: error ?? null,
        response: status
          ? 'Package booked with Leopards'
          : error || 'Error: Something went wrong!',
        raw: response.data,
      };
    } catch (err) {
      this.logger.error('bookParcel error', err?.response?.data || err);
      const data = err?.response?.data ?? {};
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: data?.error ?? err?.message,
        response: 'Error: Something went wrong!',
      };
    }
  }

  /**
   * Batch bookPacket
   * Expects an array `packets` in `payload`.
   */
  async batchBookParcels(orders: any[], courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.apiKey,
        api_password: courierAccount.apiPassword,
        packets: orders,
      };
      const response = await this.post<LeopardResponse>(
        'batchBookPacket/format/json',
        body,
      );
      this.logger.log('batchBookPacket response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('batchBookPacket error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Track booked packet(s) (trackBookedPacket).
   * Accepts a single tracking number string or array of track numbers.
   */
  async checkParcelStatus(
    trackingNumber: string | string[],
    courierAccount: any,
  ) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        track_numbers: trackingNumber,
      };
      const response = await this.post<LeopardResponse>(
        'trackBookedPacket/format/json',
        body,
      );
      const { status, error, packet_list } = response.data ?? {};
      const parcel = Array.isArray(packet_list) ? packet_list[0] : packet_list;
      const { booked_packet_status, activity_date, status_remarks, reverseCN } =
        parcel ?? {};
      const history = parcel?.['Tracking Detail'] ?? [];
      return {
        isSuccess: Boolean(Number(status)),
        error,
        history,
        status: booked_packet_status ?? null,
        date: activity_date ?? null,
        remarks: status_remarks ?? null,
        data: {
          reverseCN,
          parcel,
        },
        response: Number(status) === 0 ? error : 'Current Booking status!',
        raw: response.data,
      };
    } catch (err) {
      this.logger.error('checkParcelStatus error', err?.response?.data || err);
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        data: {},
        history: [],
        status: null,
        date: null,
        remarks: null,
        error: data?.error ?? err?.message,
        response: 'Error in getting booking status!',
      };
    }
  }

  /**
   * Cancel booked packet(s)
   * `trackingNumber` can be a single CN or comma-separated list.
   */
  async cancelBooking(trackingNumber: string | string[], courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        cn_numbers: Array.isArray(trackingNumber)
          ? trackingNumber.join(',')
          : trackingNumber,
      };
      const response = await this.post<LeopardResponse>(
        'cancelBookedPackets/format/json',
        body,
      );
      this.logger.log('cancelBooking response', response.data);
      const { status, error } = response.data ?? {};
      return {
        isSuccess: Boolean(Number(status)),
        error,
        response: Number(status) === 0 ? error : 'Booking canceled!',
        raw: response.data,
      };
    } catch (err) {
      this.logger.error('cancelBooking error', err?.response?.data || err);
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.error ?? err?.message,
        response: 'Error in booking cancelation!',
      };
    }
  }

  /**
   * Cancel booked packet(s)
   * `trackingNumber` can be a single CN or comma-separated list.
   */
  async downloadReceipt(
    trackingNumber: string | string[],
    courierAccount: any,
  ) {}

  /**
   * Generate Load Sheet
   * Accepts cn_numbers array
   */
  async generateLoadSheet(
    cnNumbers: string[],
    courierAccount: any,
    courierName?: string,
    courierCode?: string,
  ) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        cn_numbers: cnNumbers,
        courier_name: courierName,
        courier_code: courierCode,
      };
      const response = await this.post<LeopardResponse>(
        'generateLoadSheet/format/json',
        body,
      );
      this.logger.log('generateLoadSheet response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('generateLoadSheet error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Download Load Sheet
   * If responseType === 'PDF' it will return ArrayBuffer (binary), otherwise JSON
   */
  async downloadLoadSheet(
    loadSheetId: number,
    courierAccount: any,
    responseType: 'PDF' | 'JSON' = 'JSON',
  ) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        load_sheet_id: loadSheetId,
        response_type: responseType,
      };
      const response = await this.post<any>('downloadLoadSheet/', body, {
        responseType: responseType === 'PDF' ? 'arraybuffer' : 'json',
      });
      this.logger.log('downloadLoadSheet response received');
      return {
        isSuccess: true,
        data: response.data,
      };
    } catch (err) {
      this.logger.error('downloadLoadSheet error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get Booked Packet Last Statuses by date range
   */
  async getBookedPacketLastStatuses(params: {
    fromDate?: string;
    toDate?: string;
    apiKey?: string;
    apiPassword?: string;
  }) {
    try {
      const body = {
        api_key: params.apiKey,
        api_password: params.apiPassword,
        from_date: params.fromDate,
        to_date: params.toDate,
      };
      const response = await this.post<LeopardResponse>(
        'getBookedPacketLastStatus/format/json',
        body,
      );
      this.logger.log('getBookedPacketLastStatuses response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error(
        'getBookedPacketLastStatuses error',
        err?.response?.data || err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get Shipment Details By Order ID(s)
   */
  async getShipmentDetailsByOrderIDs(
    orderIds: string[] | string,
    courierAccount: any,
  ) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        order_id: Array.isArray(orderIds) ? orderIds.join(',') : orderIds,
      };
      const response = await this.post<LeopardResponse>(
        'getShipmentDetailsByOrderID/format/json',
        body,
      );
      this.logger.log('getShipmentDetailsByOrderIDs response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error(
        'getShipmentDetailsByOrderIDs error',
        err?.response?.data || err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get all Banks
   */
  async getAllBanks(courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
      };
      const response = await this.post<LeopardResponse>(
        'getAllBanks/format/json',
        body,
      );
      this.logger.log('getAllBanks response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('getAllBanks error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Create shipper
   */
  async createShipper(payload: any, courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        ...payload,
      };
      const response = await this.post<LeopardResponse>(
        'createShipper/format/json',
        body,
      );
      this.logger.log('createShipper response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('createShipper error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get Payment Details by CN numbers
   */
  async getPaymentDetails(cnNumbers: string[] | string, courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        cn_numbers: Array.isArray(cnNumbers) ? cnNumbers.join(',') : cnNumbers,
      };
      const response = await this.post<LeopardResponse>(
        'getPaymentDetails/format/json',
        body,
      );
      this.logger.log('getPaymentDetails response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('getPaymentDetails error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get Tariff Details (GET or POST as doc shows, using GET query string option)
   */
  async getTariffDetails(params: {
    packet_weight: number;
    shipment_type: number;
    origin_city: number | string;
    destination_city: number | string;
    cod_amount?: number;
    courierAccount: any;
  }) {
    try {
      const qs = new URLSearchParams({
        api_key: params.courierAccount.key,
        api_password: params.courierAccount.password,
        packet_weight: String(params.packet_weight),
        shipment_type: String(params.shipment_type),
        origin_city: String(params.origin_city),
        destination_city: String(params.destination_city),
        cod_amount: String(params.cod_amount ?? 0),
      }).toString();

      const endpoint = `getTariffDetails/format/json/?${qs}`;
      const url = `${this.baseUrl}${endpoint}`;
      this.logger.debug(`GET ${url}`);
      const resp = await firstValueFrom(this.http.get<LeopardResponse>(url));
      this.logger.log('getTariffDetails response', resp.data);
      return this.normalizeLeopardResponse(resp.data);
    } catch (err) {
      this.logger.error('getTariffDetails error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get Shipping Charges (GET)
   */
  async getShippingCharges(cnNumbers: string[] | string, courierAccount: any) {
    try {
      const qs = new URLSearchParams({
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        cn_numbers: Array.isArray(cnNumbers) ? cnNumbers.join(',') : cnNumbers,
      }).toString();
      const endpoint = `getShippingCharges/format/json/?${qs}`;
      const url = `${this.baseUrl}${endpoint}`;
      const resp = await firstValueFrom(this.http.get<LeopardResponse>(url));
      this.logger.log('getShippingCharges response', resp.data);
      return this.normalizeLeopardResponse(resp.data);
    } catch (err) {
      this.logger.error('getShippingCharges error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get Shipper Details (GET)
   */
  async getShipperDetails(
    requestParam: string,
    requestValue: string,
    courierAccount: any,
  ) {
    try {
      const qs = new URLSearchParams({
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        request_param: requestParam,
        request_value: requestValue,
      }).toString();
      const endpoint = `getShipperDetails/format/json/?${qs}`;
      const resp = await firstValueFrom(
        this.http.get<LeopardResponse>(`${this.baseUrl}${endpoint}`),
      );
      this.logger.log('getShipperDetails response', resp.data);
      return this.normalizeLeopardResponse(resp.data);
    } catch (err) {
      this.logger.error('getShipperDetails error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Electronic Proof Of Delivery (POD)
   */
  async proofOfDelivery(cnNumbers: string[] | string, courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        cn_numbers: Array.isArray(cnNumbers) ? cnNumbers.join(',') : cnNumbers,
      };
      const response = await this.post<LeopardResponse>(
        'electronicProofOfDelivery/format/json',
        body,
      );
      this.logger.log('proofOfDelivery response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('proofOfDelivery error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Shipper Advice List
   */
  async shipperAdviceList(query: any, courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        ...query,
      };
      const response = await this.post<LeopardResponse>(
        'shipperAdviceList/format/json',
        body,
      );
      this.logger.log('shipperAdviceList response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('shipperAdviceList error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Update Shipper Advice (Add Shipper Advice)
   */
  async updateShipperAdvice(data: any[], courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        data,
      };
      const response = await this.post<LeopardResponse>(
        'updateShipperAdvice/format/json',
        body,
      );
      this.logger.log('updateShipperAdvice response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error(
        'updateShipperAdvice error',
        err?.response?.data || err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Activity Log
   */
  async activityLog(query: any, courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
        ...query,
      };
      const response = await this.post<LeopardResponse>(
        'activityLog/format/json',
        body,
      );
      this.logger.log('activityLog response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('activityLog error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get all cities
   */
  async getAllCities(courierAccount: any) {
    try {
      const body = {
        api_key: courierAccount.key,
        api_password: courierAccount.password,
      };
      const response = await this.post<LeopardResponse>(
        'getAllCities/format/json',
        body,
      );
      this.logger.log('getAllCities response', response.data);
      return this.normalizeLeopardResponse(response.data);
    } catch (err) {
      this.logger.error('getAllCities error', err?.response?.data || err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }
}

export default LeopardCourier;
