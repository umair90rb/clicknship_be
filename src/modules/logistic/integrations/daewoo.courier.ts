// src/modules/logistics/integrations/Daewoo/index.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ICourierService } from '../types/courier.interface'; // per your project layout
import { AxiosResponse } from 'axios';

/**
 * DaewooCourier service
 *
 * Uses Daewoo COD Home Delivery API (version per uploaded PDF).
 * Implementation follows the patterns used in LeopardCourier and CallCourier you provided.
 *
 * Sources:
 * - Daewoo API Integration Guide (local PDF)
 * - production integration: /mnt/data/deawooCourier.js
 *
 * See uploaded files for payload examples and full field lists. :contentReference[oaicite:4]{index=4} :contentReference[oaicite:5]{index=5}
 */
@Injectable()
export default class DaewooCourier implements ICourierService {
  private readonly logger = new Logger(DaewooCourier.name);
  private readonly baseUrl = 'https://codapi.daewoo.net.pk/';

private readonly metadata = {
    name: 'DaewooCourier',
    allowBulkBooking: false
  }

  get getMetadata(){
    return this.metadata;
  }

  constructor(private readonly http: HttpService) {}

  // ----------------------------- Helpers -----------------------------

  private getUrlWithApiCred(path: string, deliveryAccount: any) {
    const apiKey = deliveryAccount?.key || deliveryAccount?.apiKey || '';
    const apiUser = deliveryAccount?.username || deliveryAccount?.apiUser || '';
    const apiPassword =
      deliveryAccount?.password || deliveryAccount?.apiPassword || '';
    // trim slashes
    const p = path.startsWith('/') ? path.slice(1) : path;
    return `${this.baseUrl}${p}?apiKey=${encodeURIComponent(apiKey)}&apiUser=${encodeURIComponent(apiUser)}&apiPassword=${encodeURIComponent(apiPassword)}`;
  }

  private async get<T = any>(url: string): Promise<AxiosResponse<T>> {
    try {
      this.logger.debug(`GET ${url}`);
      const obs = this.http.get<T>(url);
      const resp = await firstValueFrom(obs);
      return resp;
    } catch (err) {
      this.logger.error(
        `HTTP GET ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private async post<T = any>(
    url: string,
    body: any,
  ): Promise<AxiosResponse<T>> {
    try {
      this.logger.debug(`POST ${url} - body: ${JSON.stringify(body)}`);
      const obs = this.http.post<T>(url, body, {
        headers: { 'Content-Type': 'application/json' },
      });
      const resp = await firstValueFrom(obs);
      return resp;
    } catch (err) {
      this.logger.error(
        `HTTP POST ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private normalizeBasicResponse(apiResp: any) {
    // Daewoo responses use Success/Error/Response fields.
    const Success = apiResp?.Success ?? apiResp?.Result?.Success ?? false;
    const Error = apiResp?.Error ?? apiResp?.Result?.Error ?? false;
    const Response =
      apiResp?.Response ??
      apiResp?.Result?.Response ??
      apiResp?.Result?.ResponseDetail ??
      null;
    return {
      isSuccess: Boolean(Success),
      error: Error ? Response || Error : null,
      response: Response,
      raw: apiResp,
    };
  }

  // ----------------------------- ICourierService methods -----------------------------

  /**
   * Book a single parcel using Daewoo quickBook.
   * Uses deliveryAccount for credentials and uses fields commonly provided by your system.
   *
   * NOTE: we skip DB city lookup here (you said you'll add it). So ensure deliveryAccount or order contains
   * `source_terminal_id` and `destination_terminal_id` (terminal IDs) if you want booking to succeed.
   */
  async bookParcel(order: any, deliveryAccount: any) {
    try {
      // Build body similar to production JS; but skip CityNameMaping lookup
      const body = {
        order_no: `${order.order_number ?? ''}`,
        source_terminal_id:
          deliveryAccount?.cost_center ??
          deliveryAccount?.source_terminal_id ??
          '0',
        destination_terminal_id:
          order.destination_terminal_id ??
          deliveryAccount?.destination_terminal_id ??
          '0',
        receiver_name:
          `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim(),
        receiver_cnic: order.customer?.cnic ?? '',
        receiver_mobile: order.customer?.phone
          ? `0${String(order.customer.phone).replace(/^0/, '')}`
          : '',
        receiver_address: `${order.address?.address1 ?? ''}${order.address?.city ? ', ' + order.address.city : ''}`,
        receiver_city: order.address?.city ?? '',
        receiver_email: order.customer?.email ?? 'empty',
        remarks: order.special_instructions ?? 'rush delivery',
        category_id: '0',
        qty: order.items?.length ?? 1,
        weight: String(order.weightKg ?? order.weight ?? 0.25),
        barcode: order.barcode ?? '0',
        cod_amount: order.total_price ?? 0,
        source_location_point: order.source_location_point ?? '0.0',
        destination_location_point: order.destination_location_point ?? '0.0',
        source_location_address: order.source_location_address ?? '',
        destination_location_address:
          order.destination_location_address ?? order.address?.address1 ?? '',
        item_description: Array.isArray(order.items)
          ? order.items.map((it) => `${it.name}/${it.quantity}`).join(' - ')
          : (order.item_description ?? ''),
      };

      const url = this.getUrlWithApiCred(
        'api/booking/quickBook',
        deliveryAccount,
      );
      const resp = await this.post<any>(url, body);
      const data = resp.data ?? {};

      // Fields per PDF / production JS: Success, Error, Response, TrackNo, Barcode, CashCollection, OrderId
      const {
        TrackNo,
        Error,
        Success,
        Response,
        Validations,
        Barcode,
        CashCollection,
        OrderId,
      } = data || {};

      return {
        cn: TrackNo ?? null,
        slip: JSON.stringify({ Validations, Barcode, CashCollection, OrderId }),
        isSuccess: Boolean(Success),
        error: Error ?? (Success ? null : Response),
        response: Response ?? null,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'bookParcel error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      const { Error, Response } = data || {};
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: Error ?? Response ?? err?.message,
        response: Response ?? 'Error in booking parcel',
        raw: data,
      };
    }
  }

  /**
   * quickBookV3 - book from multiple locations (if you need to book with specific source terminal)
   */
  async bookParcelV3(order: any, deliveryAccount: any) {
    try {
      const body = {
        order_no: `${order.order_number ?? ''}`,
        // when multiple source terminals are supported, you must provide correct source_terminal_id
        source_terminal_id: deliveryAccount?.cost_center ?? '0',
        destinations: order.destinations ?? [
          {
            destination_terminal_id:
              order.destination_terminal_id ??
              deliveryAccount?.destination_terminal_id ??
              '0',
            receiver_name:
              `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim(),
            receiver_mobile: order.customer?.phone
              ? `0${String(order.customer.phone).replace(/^0/, '')}`
              : '',
            receiver_address: `${order.address?.address1 ?? ''}${order.address?.city ? ', ' + order.address.city : ''}`,
            receiver_email: order.customer?.email ?? 'empty',
            qty: order.items?.length ?? 1,
            weight: String(order.weightKg ?? order.weight ?? 0.25),
            cod_amount: order.total_price ?? 0,
            item_description: Array.isArray(order.items)
              ? order.items.map((it) => `${it.name}/${it.quantity}`).join(' - ')
              : (order.item_description ?? ''),
          },
        ],
      };

      const url = this.getUrlWithApiCred(
        'api/booking/quickBookV3',
        deliveryAccount,
      );
      const resp = await this.post<any>(url, body);
      const data = resp.data ?? {};
      const {
        TrackNo,
        Error,
        Success,
        Response,
        Validations,
        Barcode,
        CashCollection,
        OrderId,
      } = data || {};

      return {
        cn: TrackNo ?? null,
        slip: JSON.stringify({ Validations, Barcode, CashCollection, OrderId }),
        isSuccess: Boolean(Success),
        error: Error ?? (Success ? null : Response),
        response: Response ?? null,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'bookParcelV3 error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: data?.Error ?? data?.Response ?? err?.message,
        response: data?.Response ?? 'Error in booking parcel (V3)',
        raw: data,
      };
    }
  }

  /**
   * Track booking - quickTrack
   */
  async checkParcelStatus(
    trackingNumber: string | string[],
    deliveryAccount?: any,
  ) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : trackingNumber;
      const url = `${this.baseUrl}api/booking/quickTrack?trackingNo=${encodeURIComponent(tn)}`;
      // quickTrack uses trackingNo param only (no credentials required per doc)
      const resp = await this.get<any>(url);
      const data = resp.data ?? {};
      // The API returns { Result: { Success, Error, Response, CurrentTrackStatus, TrackingDetails } }
      const Result = data?.Result ?? data;
      const { Error, Response, Success, TrackingDetails, CurrentTrackStatus } =
        Result ?? {};

      return {
        isSuccess: Boolean(Success),
        error: Error ?? null,
        history: TrackingDetails ?? [],
        status:
          Array.isArray(CurrentTrackStatus) && CurrentTrackStatus.length
            ? (CurrentTrackStatus[0]?.status_name ??
              CurrentTrackStatus[0]?.Status ??
              null)
            : null,
        date: null,
        remarks: null,
        data: { currentTrackStatus: CurrentTrackStatus ?? null, rest: Result },
        response: Response ?? null,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'checkParcelStatus error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      const Result = data?.Result ?? {};
      return {
        isSuccess: false,
        error: Result?.Error ?? data?.Error ?? err?.message,
        history: data?.TrackingDetails ?? [],
        status: null,
        date: null,
        remarks: null,
        data: {},
        response: data?.Response ?? 'Error in fetching booking status!',
        raw: data,
      };
    }
  }

  /**
   * Cancel booking - quickCancel
   */
  async cancelBooking(trackingNumber: string | string[], deliveryAccount: any) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : trackingNumber;
      const url =
        this.getUrlWithApiCred('api/booking/quickCancel', deliveryAccount) +
        `&trackingNo=${encodeURIComponent(tn)}`;
      const resp = await this.post<any>(url, {}); // some implementations call POST without body
      const data = resp.data ?? {};
      const { Error, Success, Response } = data || {};
      return {
        isSuccess: Boolean(Success),
        error: Error ? (Response ?? Error) : null,
        response: Response ?? null,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'cancelBooking error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.Error ?? err?.message,
        response: data?.Response ?? 'Error in booking cancelation!',
        raw: data,
      };
    }
  }

  /**
   * Get all locations (terminals) allowed for booking: /api/cargo/getLocations
   */
  async getLocations(deliveryAccount: any) {
    try {
      const url = this.getUrlWithApiCred(
        'api/cargo/getLocations',
        deliveryAccount,
      );
      const resp = await this.get<any>(url);
      const data = resp.data ?? {};
      const { Success, Error, Response, ResponseDetail, Data } = data || {};
      return {
        isSuccess: Boolean(Success),
        error: Error ?? null,
        response: Response ?? null,
        responseDetail: ResponseDetail ?? null,
        data: Data ?? [],
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'getLocations error',
        err?.response?.data ?? err?.message ?? err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Calculate tariff / service charges: quickCalculateRate
   * Expects payload { destination_terminal_id, qty, weight, ... }
   */
  async quickCalculateRate(payload: any, deliveryAccount: any) {
    try {
      const url = this.getUrlWithApiCred(
        'api/booking/quickCalculateRate',
        deliveryAccount,
      );
      const resp = await this.post<any>(url, payload);
      const data = resp.data ?? {};
      const { Success, Error, Response, ServiceCharges } = data || {};
      return {
        isSuccess: Boolean(Success),
        error: Error ?? null,
        response: Response ?? null,
        serviceCharges: ServiceCharges ?? null,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'quickCalculateRate error',
        err?.response?.data ?? err?.message ?? err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * Get booking detail (if available in API). The PDF doesn't give a single canonical endpoint name for all details;
   * we'll attempt to call a plausible endpoint path. If your real API has a different route, change accordingly.
   */
  async getBookingDetail(trackingNumber: string, deliveryAccount: any) {
    try {
      // The doc uses quickTrack for tracking details. We'll reuse quickTrack result as booking detail.
      return await this.checkParcelStatus(trackingNumber, deliveryAccount);
    } catch (err) {
      this.logger.error(
        'getBookingDetail error',
        err?.response?.data ?? err?.message ?? err,
      );
      return { isSuccess: false, error: err?.message ?? err };
    }
  }

  /**
   * Download receipt / slip - Daewoo has sample Track/Booking endpoints, but if there is a public printable slip endpoint,
   * you can use the following pattern (adjust if Daewoo has different URL).
   *
   * NOTE: if the API returns binary PDF you may call http.get with responseType 'arraybuffer' and return the buffer.
   */
  async downloadReceipt(trackingNumber: string[], deliveryAccount: any) {
    try {
      // There is no explicit PDF endpoint in the v1.3 doc; return a best-effort public URL (adjust if wrong).
      const publicSlipUrl = `${this.baseUrl}Booking/AfterSavePublic/${encodeURIComponent(String(trackingNumber))}`;
      return {
        isSuccess: true,
        url: publicSlipUrl,
        response: 'Public slip url (verify with Daewoo if available)',
      };
    } catch (err) {
      this.logger.error('downloadReceipt error', err?.message ?? err);
      return { isSuccess: false, error: err?.message ?? err };
    }
  }

  // ----------------------------- Optional, convenience wrappers -----------------------------

  /**
   * Convenience alias used by other couriers: downloadLoadSheet
   */
  async downloadLoadSheet(
    loadSheetId: number,
    deliveryAccount: any,
    responseType: 'JSON' | 'PDF' = 'JSON',
  ) {
    // Not explicitly present in Daewoo doc; return not-implemented or a stub.
    return {
      isSuccess: false,
      error:
        'downloadLoadSheet not supported by Daewoo API (use runsheet endpoints if available)',
    };
  }

  /**
   * Return all supported endpoints summary (for debug)
   */
  // getMetadata() {
  //   return {
  //     baseUrl: this.baseUrl,
  //     implemented: [
  //       'bookParcel',
  //       'bookParcelV3',
  //       'checkParcelStatus',
  //       'cancelBooking',
  //       'getLocations',
  //       'quickCalculateRate',
  //       'getBookingDetail',
  //       'downloadReceipt',
  //     ],
  //     notes:
  //       'This implementation follows the Daewoo API Integration Guide and your production JS adapter.',
  //   };
  // }
}
