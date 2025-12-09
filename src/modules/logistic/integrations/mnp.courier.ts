// src/modules/logistics/integrations/Mnp/index.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface'; // adjust path if your project differs

/**
 * M&P (Mnp) courier integration for Clicknship
 * - Implements endpoints from the M&P API documentation
 * - Ported from production adapter mnpCourier.js
 *
 * Sources:
 * - API Documentation (uploaded). :contentReference[oaicite:2]{index=2}
 * - production integration: mnpCourier.js. :contentReference[oaicite:3]{index=3}
 */
@Injectable()
export default class MnpCourier implements ICourierService {
  private readonly logger = new Logger(MnpCourier.name);
  private readonly baseUrl: string;
  private readonly metadata = {
    name: 'MnpCourier',
    allowBulkBooking: false
  }

  get getMetadata(){
    return this.metadata;
  }

  constructor(private readonly http: HttpService) {
    // default base url taken from your production adapter
    this.baseUrl = 'https://api.mnp.com.pk/'; // replace with actual if doc shows different base
  }

  // -------------------- Helpers --------------------

  private async get<T = any>(path: string, params?: any, headers?: any): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.debug(`GET ${url} params=${JSON.stringify(params)}`);
      const resp = await firstValueFrom(this.http.get<T>(url, { params, headers }));
      return resp;
    } catch (err) {
      this.logger.error(`GET ${url} failed`, err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  private async post<T = any>(path: string, body: any = {}, headers?: any, responseType?: 'json' | 'arraybuffer'): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.debug(`POST ${url} body=${JSON.stringify(body)}`);
      const resp = await firstValueFrom(
        this.http.post<T>(url, body, {
          headers: { 'Content-Type': 'application/json', ...(headers || {}) },
          responseType: responseType === 'arraybuffer' ? 'arraybuffer' : 'json',
        }),
      );
      return resp;
    } catch (err) {
      this.logger.error(`POST ${url} failed`, err?.response?.data ?? err?.message ?? err);
      throw err;
    }
  }

  private normalizeResponse(apiResp: any, successFlagPaths: string[] = ['success', 'Success', 'Status', 'status']) {
    // Generic normalizer, tries multiple common success keys
    const keys = successFlagPaths;
    let isSuccess = false;
    for (const k of keys) {
      const v = apiResp?.[k];
      if (typeof v === 'boolean') {
        isSuccess = v;
        break;
      }
      if (typeof v === 'number') {
        isSuccess = Number(v) === 1 || Number(v) === 0 ? Number(v) === 1 : Boolean(Number(v) === 0); // handle both conventions
        // prefer true when value equals 1
        break;
      }
      if (typeof v === 'string') {
        if (v === '1' || v.toLowerCase() === 'success' || v.toLowerCase() === 'ok') {
          isSuccess = true;
          break;
        }
      }
    }

    // fallback: look for "error" presence
    const error = apiResp?.error ?? apiResp?.Error ?? (!isSuccess ? apiResp?.message ?? apiResp?.Response ?? null : null);

    return {
      isSuccess,
      error,
      raw: apiResp,
      response: apiResp?.message ?? apiResp?.Response ?? null,
    };
  }

  // -------------------- ICourierService Methods --------------------

  /**
   * Book a single parcel (Quick Booking / SaveBooking or endpoint per M&P docs).
   * Uses deliveryAccount for credentials (you can pass headers via deliveryAccount).
   */
  async bookParcel(order: any, deliveryAccount: any) {
    let resp;
    try {
      // Build payload from docs & production adapter patterns.
      // You will add DB city mapping later; ensure deliveryAccount or order contains destination id if required.
      const body = {
        // Example fields - adjust to match doc's exact field names if different
        client_id: deliveryAccount?.client_id ?? deliveryAccount?.key ?? '',
        client_secret: deliveryAccount?.client_secret ?? deliveryAccount?.password ?? '',
        reference_no: `${order.order_number ?? ''}`,
        consignee_name: `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim(),
        consignee_phone: order.customer?.phone ? String(order.customer.phone) : '',
        consignee_address: order.address?.address1 ?? '',
        consignee_city: order.address?.city ?? '',
        pieces: order.items?.length ?? 1,
        weight: order.weight_kg ?? order.weight ?? 0.25,
        cod_amount: order.total_price ?? 0,
        description: Array.isArray(order.items)
          ? order.items.map((i) => `${i.name}/${i.quantity}`).join(' - ')
          : order.description ?? '',
        // additional fields per M&P API specification
      };

      // header auth pattern — many of your adapters use Authorization header containing deliveryAccount.key
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};

      // Use appropriate path from M&P API doc. Here using "booking/create" as example - replace if doc indicates different path.
      resp = await this.post<any>('booking/create', body, headers);
      const data = resp.data ?? {};

      // Production adapter likely returned tracking number and response message; normalize accordingly.
      const trackingNumber = data?.tracking_number ?? data?.consignment_no ?? data?.cn ?? null;

      const normalized = this.normalizeResponse(data, ['success', 'Success', 'status']);

      return {
        cn: trackingNumber,
        slip: JSON.stringify(data),
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.response ?? 'Booking completed',
        raw: data,
      };
    } catch (err) {
      this.logger.error('bookParcel error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: data?.error ?? data?.message ?? err?.message,
        response: data?.Response ?? 'Error in booking parcel',
        raw: data,
      };
    }
  }

  /**
   * Bulk / batch booking
   */
  async batchBookParcels(orders: any[], deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.post<any>('booking/bulkCreate', { bookings: orders }, headers);
      const data = resp.data ?? {};
      const normalized = this.normalizeResponse(data);
      return { isSuccess: normalized.isSuccess, error: normalized.error, response: normalized.response, raw: data };
    } catch (err) {
      this.logger.error('batchBookPacket error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Check parcel status / track (single or multiple)
   */
  async checkParcelStatus(trackingNumber: string | string[], deliveryAccount: any) {
    try {
      const tn = Array.isArray(trackingNumber) ? trackingNumber.join(',') : String(trackingNumber);
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.get<any>(`tracking/${encodeURIComponent(tn)}`, {}, headers);
      const data = resp.data ?? {};

      // Typical M&P tracking structure may include history array
      const history = data?.history ?? data?.tracking_history ?? data?.data ?? [];
      const latest = Array.isArray(history) && history.length ? history[0] : null;

      return {
        isSuccess: true,
        error: null,
        history,
        status: latest?.status ?? data?.status ?? null,
        date: latest?.date_time ?? latest?.timestamp ?? null,
        remarks: latest?.remarks ?? null,
        data,
        response: data?.message ?? 'Current Booking status!',
        raw: data,
      };
    } catch (err) {
      this.logger.error('checkParcelStatus error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.error ?? data?.message ?? err?.message,
        history: [],
        status: null,
        date: null,
        remarks: null,
        data: {},
        response: 'Error in getting booking status!',
        raw: data,
      };
    }
  }

  /**
   * Cancel booking (if API supports it)
   */
  async cancelBooking(trackingNumber: string | string[], deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const payload = { cn: Array.isArray(trackingNumber) ? trackingNumber.join(',') : trackingNumber };
      const resp = await this.post<any>('booking/cancel', payload, headers);
      const data = resp.data ?? {};
      const normalized = this.normalizeResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.response ?? 'Cancel request processed',
        raw: data,
      };
    } catch (err) {
      this.logger.error('cancelBooking error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, response: 'Error in booking cancellation', raw: data };
    }
  }

  /**
   * Download receipt / airwaybill (may return PDF/binary)
   * If the API supports PDF, uses responseType 'arraybuffer' and returns binary in data.
   */
  async downloadReceipt(trackingNumber: string | string[], deliveryAccount: any) {
    try {
      const tn = Array.isArray(trackingNumber) ? trackingNumber.join(',') : String(trackingNumber);
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      // Example endpoint — replace with actual M&P endpoint (check API doc). Using 'booking/airwaybill' placeholder.
      const resp = await this.post<any>(`booking/airwaybill`, { cn: tn }, headers, 'arraybuffer');
      return { isSuccess: true, data: resp.data, response: 'Receipt downloaded', raw: resp.data };
    } catch (err) {
      this.logger.error('downloadReceipt error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, response: 'Error downloading receipt', raw: data };
    }
  }

  /**
   * Get tariff / calculate charges
   */
  async getTariffDetails(params: any) {
    try {
      // Accepts params containing weight, origin, destination, cod amount, etc.
      const resp = await this.get<any>('rates/calculate', params);
      const data = resp.data ?? {};
      const normalized = this.normalizeResponse(data);
      return { isSuccess: normalized.isSuccess, error: normalized.error, response: normalized.response, rates: data?.rates ?? data?.ServiceCharges ?? null, raw: data };
    } catch (err) {
      this.logger.error('getTariffDetails error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Get shipping charges by CNs
   */
  async getShippingCharges(cnNumbers: string[] | string, deliveryAccount: any) {
    try {
      const params = { cn: Array.isArray(cnNumbers) ? cnNumbers.join(',') : cnNumbers };
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.get<any>('charges', params, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, error: null, data: data?.charges ?? data, raw: data };
    } catch (err) {
      this.logger.error('getShippingCharges error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Create shipper (if supported)
   */
  async createShipper(payload: any, deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.post<any>('shippers/create', payload, headers);
      const data = resp.data ?? {};
      const normalized = this.normalizeResponse(data);
      return { isSuccess: normalized.isSuccess, error: normalized.error, response: normalized.response, raw: data };
    } catch (err) {
      this.logger.error('createShipper error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Get payment details (if supported)
   */
  async getPaymentDetails(cnNumbers: string[] | string, deliveryAccount: any) {
    try {
      const params = { cn: Array.isArray(cnNumbers) ? cnNumbers.join(',') : cnNumbers };
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.get<any>('payments/details', params, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, data, raw: data };
    } catch (err) {
      this.logger.error('getPaymentDetails error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Proof of Delivery
   */
  async proofOfDelivery(cnNumbers: string[] | string, deliveryAccount: any) {
    try {
      const payload = { cn: Array.isArray(cnNumbers) ? cnNumbers.join(',') : cnNumbers };
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.post<any>('booking/pod', payload, headers);
      const data = resp.data ?? {};
      const normalized = this.normalizeResponse(data);
      return { isSuccess: normalized.isSuccess, pod: data?.pod ?? null, raw: data };
    } catch (err) {
      this.logger.error('proofOfDelivery error', err?.response?.data ?? err?.message ?? err);
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Shipper advice list
   */
  async shipperAdviceList(query: any, deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.get<any>('shipper/advice', query, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, data: data?.advice ?? data, raw: data };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('shipperAdviceList error', data);
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Update shipper advice
   */
  async updateShipperAdvice(dataArr: any[], deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.post<any>('shipper/advice/update', { data: dataArr }, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, raw: data };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('updateShipperAdvice error', data);
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Activity log
   */
  async activityLog(query: any, deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.get<any>('activity/log', query, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, data: data?.logs ?? data, raw: data };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('activityLog error', data);
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Get all cities
   */
  async getAllCities(deliveryAccount: any) {
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      const resp = await this.get<any>('locations/cities', {}, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, cities: data?.cities ?? data, raw: data };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getAllCities error', data);
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  // small utility used by your BookingService in other courier adapters
  async downloadLoadSheet(loadSheetId: number, deliveryAccount: any, responseType: 'JSON' | 'PDF' = 'JSON') {
    // if M&P provides runsheet / loadsheet endpoints, call them here; otherwise return not supported stub.
    try {
      const headers = deliveryAccount?.key ? { Authorization: deliveryAccount.key } : {};
      // endpoint placeholder
      const resp = await this.get<any>(`loadsheet/${loadSheetId}`, {}, headers);
      const data = resp.data ?? {};
      return { isSuccess: true, data, raw: data };
    } catch (err) {
      const data = err?.response?.data ?? {};
      return { isSuccess: false, error: data?.error ?? err?.message, raw: data };
    }
  }

  /**
   * Metadata about implemented methods
   */
//   getMetadata() {
//     return {
//       baseUrl: this.baseUrl,
//       implemented: [
//         'bookParcel',
//         'batchBookPacket',
//         'checkParcelStatus',
//         'cancelBooking',
//         'downloadReceipt',
//         'getTariffDetails',
//         'getShippingCharges',
//         'createShipper',
//         'getPaymentDetails',
//         'proofOfDelivery',
//         'shipperAdviceList',
//         'updateShipperAdvice',
//         'activityLog',
//         'getAllCities',
//       ],
//       notes: 'M&P implementation derived from API doc and production adapter. Fill real path strings if API doc names differ.',
//     };
//   }
}
