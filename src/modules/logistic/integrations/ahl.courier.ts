// src/modules/logistics/integrations/AHL/index.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface'; // adjust path if your project differs

/**
 * AHLCourier
 *
 * Implements endpoints described in AHL API - Updated.pdf (auth, order booking,
 * tracking, cancel, invoice, sms link, status list, amounts, detailed tracking, shipper advise, etc.)
 *
 * - Uses HttpService from @nestjs/axios
 * - Uses Nest Logger
 * - Skips DB lookups — plug CityNameMaping / DB logic where required later
 *
 * Source: AHL API - Updated.pdf. :contentReference[oaicite:1]{index=1}
 */
@Injectable()
export default class AHLCourier implements ICourierService {
  private readonly logger = new Logger(AHLCourier.name);
  private readonly baseUrl = 'https://admin.ahlogistic.pk/api/';
  private readonly metadata = {
    name: 'AHLCourier',
    allowBulkBooking: false,
  };

  get getMetadata() {
    return this.metadata;
  }

  constructor(private readonly http: HttpService) {}

  // ---------------- Helpers ----------------

  private async post<T = any>(
    path: string,
    body: any = {},
    token?: string,
    config: any = {},
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      const headers: any = {
        'Content-Type': 'application/json',
        Accept: '*/*',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      this.logger.debug(`POST ${url} body=${JSON.stringify(body)}`);
      const resp = await firstValueFrom(
        this.http.post<T>(url, body, { headers, ...config }),
      );
      return resp;
    } catch (err) {
      this.logger.error(
        `POST ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private async get<T = any>(
    path: string,
    token?: string,
    params: any = {},
    config: any = {},
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      const headers: any = { Accept: '*/*' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      this.logger.debug(`GET ${url} params=${JSON.stringify(params)}`);
      const resp = await firstValueFrom(
        this.http.get<T>(url, { headers, params, ...config }),
      );
      return resp;
    } catch (err) {
      this.logger.error(
        `GET ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private normalizeAhlResponse(apiResp: any) {
    // AHL uses { status: 1/0, message: "...", error: {...}, ... }
    const status = apiResp?.status;
    const isSuccess = Number(status) === 1;
    const message = apiResp?.message ?? null;
    const error = isSuccess ? null : (apiResp?.error ?? message ?? null);
    return { isSuccess, message, error, raw: apiResp };
  }

  // ---------------- AHL API Methods ----------------

  /**
   * Authenticate (get access_token).
   * If deliveryAccount contains credentials, use them; else accept credentials param.
   *
   * Example request body (per docs):
   * { email: "demi@ahl.com", password: "ahl@1998" }
   */
  async auth(credentials?: { email: string; password: string }) {
    try {
      const body = credentials ?? {
        email: 'demi@ahl.com',
        password: 'ahl@1998',
      };
      const resp = await this.post<any>('shopify-vendor-access-token', body);
      const data = resp.data ?? {};
      const { status, message, access_token } = data;
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        token: access_token ?? null,
        message: normalized.message,
        error: normalized.error,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'auth error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        token: null,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Book order (shopify-order)
   * Accepts order object and deliveryAccount. deliveryAccount should provide:
   * - token (access_token) OR { email,password } to call auth
   *
   * Request body per docs (required fields):
   * {
   *  vendor_id, consignee_phone, consignee_first_name, consignee_last_name,
   *  consignee_email, consignee_address, consignee_country, consignee_state,
   *  consignee_city, consignment_order_id, consignment_order_type, vendor_weight_id,
   *  consignment_packaging, consignment_pickup_location, consignment_origin_city, consignment_cod_price, consignment_pieces, consignment_description
   * }
   */
  async bookParcel(order: any, deliveryAccount: any) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      // get token if not provided in deliveryAccount
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }

      // Build body according to doc fields (skip DB lookups)
      const body: any = {
        vendor_id:
          deliveryAccount?.vendor_id ??
          deliveryAccount?.vendorId ??
          order.vendor_id ??
          1,
        consignee_phone: order.customer?.phone
          ? String(order.customer.phone)
          : (order.consignee_phone ?? ''),
        consignee_first_name:
          order.customer?.first_name ?? order.consignee_first_name ?? '',
        consignee_last_name:
          order.customer?.last_name ?? order.consignee_last_name ?? '',
        consignee_email: order.customer?.email ?? order.consignee_email ?? '',
        consignee_address:
          order.address?.address1 ?? order.consignee_address ?? '',
        consignee_country:
          order.consignee_country ?? order.address?.country_id ?? 166,
        consignee_state:
          order.consignee_state ?? order.address?.state_id ?? 2728,
        consignee_city:
          order.consignee_city ??
          order.address?.city_id ??
          order.address?.city ??
          null,
        consignment_origin_city:
          order.origin_city ?? deliveryAccount?.origin_city ?? null,
        consignment_order_id:
          order.order_number ??
          order.consignment_order_id ??
          `#AHL${Date.now()}`,
        consignment_order_type: order.order_type ?? 1,
        consignment_cod_price: order.total_price ?? order.cod_amount ?? 0,
        vendor_weight_id:
          order.vendor_weight_id ?? deliveryAccount?.vendor_weight_id ?? null, // required per doc
        consignment_packaging: order.consignment_packaging ?? 1,
        consignment_pieces: order.items?.length ?? 1,
        consignment_pickup_location:
          order.consignment_pickup_location ??
          deliveryAccount?.pickup_location ??
          null,
        consignment_description:
          order.consignment_description ??
          (Array.isArray(order.items)
            ? order.items.map((i) => `${i.name}/${i.quantity}`).join(' - ')
            : (order.consignment_description ?? '')),
      };

      const resp = await this.post<any>('shopify-order', body, token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);

      // The doc returns order_parcel object on success
      return {
        cn: data?.order_parcel ?? null,
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'bookParcel error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        cn: null,
        isSuccess: false,
        error: data?.message ?? err?.message,
        response: 'Error in booking parcel',
        raw: data,
      };
    }
  }

  /**
   * Track order by order reference (shopify-order-track)
   * body: { order_reference_no: "#AHL..." }
   */
  async checkParcelStatus(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }

      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>('shopify-order-track', body, token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);

      const orderTrack = data?.order_track ?? {};
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        history: orderTrack?.history ?? [],
        status:
          orderTrack?.order_status ?? orderTrack?.order_status?.name ?? null,
        date: null,
        remarks: null,
        data: orderTrack,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'checkParcelStatus error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        history: [],
        status: null,
        date: null,
        remarks: null,
        data: {},
        response: 'Error in tracking order',
        raw: data,
      };
    }
  }

  /**
   * Cancel order (shopify-order-cancel)
   * body: { order_reference_no }
   */
  async cancelBooking(trackingNumber: string | string[], deliveryAccount: any) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }

      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>('shopify-order-cancel', body, token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.message,
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
        error: data?.message ?? err?.message,
        response: 'Error cancelling order',
        raw: data,
      };
    }
  }

  /**
   * Get cities (shopify-order-cities) - GET
   */
  async getAllCities(deliveryAccount: any) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const resp = await this.get<any>('shopify-order-cities', token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        data: data?.data ?? data,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'getAllCities error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Get invoice (shopify-order-invoice) - body: { order_reference_no }
   */
  async downloadReceipt(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    // AHL returns a URL inside data on success (per doc), so we return that URL.
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>('shopify-order-invoice', body, token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      // doc shows data contains an URL in data (or "data " key). Try standard keys.
      const invoiceUrl =
        data?.data ?? data?.data_url ?? data?.order_invoice ?? null;
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        url: invoiceUrl,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'downloadReceipt (invoice) error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        url: null,
        raw: data,
      };
    }
  }

  /**
   * Get SMS Link (shopify-order-sms-link) - body: { order_reference_no }
   */
  async getSmsLink(trackingNumber: string | string[], deliveryAccount: any) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>('shopify-order-sms-link', body, token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      const smsUrl = data?.data ?? null;
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        url: smsUrl,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'getSmsLink error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        url: null,
        raw: data,
      };
    }
  }

  /**
   * Get Status List (shopify-status-list) - GET
   */
  async getStatusList(deliveryAccount: any) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const resp = await this.get<any>('shopify-status-list', token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        data: data?.data ?? data,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'getStatusList error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Order amount details (shopify-order-amount-detail) - body: { order_reference_no }
   */
  async getOrderAmount(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>(
        'shopify-order-amount-detail',
        body,
        token,
      );
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        data: data?.data ?? data,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'getOrderAmount error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Detail order tracking (shopify-tracking-api) - body: { order_reference_no }
   * Returns summary of milestones (picked up, dispatched, delivered etc.)
   */
  async detailTracking(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>('shopify-tracking-api', body, token);
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        data: data?.data ?? data,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'detailTracking error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * More detail order tracking (shopify-detail-tracking-api) - body: { order_reference_no }
   * Returns tracking_history array
   */
  async moreDetailTracking(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const body = {
        order_reference_no: Array.isArray(trackingNumber)
          ? trackingNumber[0]
          : trackingNumber,
      };
      const resp = await this.post<any>(
        'shopify-detail-tracking-api',
        body,
        token,
      );
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      const tracking_history =
        data?.tracking_history ?? data?.data?.tracking_history ?? [];
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        tracking_history,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'moreDetailTracking error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        tracking_history: [],
        raw: data,
      };
    }
  }

  /**
   * Shipper advise (shopify-shipper-advise)
   * body: { order_reference_no, advise }
   */
  async shipperAdviceList(
    payload: { order_reference_no: string; advise?: string },
    deliveryAccount: any,
  ) {
    let token = deliveryAccount?.token ?? deliveryAccount?.access_token;
    try {
      if (!token && deliveryAccount?.email && deliveryAccount?.password) {
        const auth = await this.auth({
          email: deliveryAccount.email,
          password: deliveryAccount.password,
        });
        if (auth.isSuccess && auth.token) token = auth.token;
      }
      const resp = await this.post<any>(
        'shopify-shipper-advise',
        payload,
        token,
      );
      const data = resp.data ?? {};
      const normalized = this.normalizeAhlResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.message,
        raw: data,
      };
    } catch (err) {
      this.logger.error(
        'shipperAdviceList error',
        err?.response?.data ?? err?.message ?? err,
      );
      const data = err?.response?.data ?? {};
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  //   getMetadata() {
  //     return {
  //       baseUrl: this.baseUrl,
  //       implemented: [
  //         'auth',
  //         'bookParcel',
  //         'checkParcelStatus',
  //         'cancelBooking',
  //         'getAllCities',
  //         'downloadReceipt',
  //         'getSmsLink',
  //         'getStatusList',
  //         'getOrderAmount',
  //         'detailTracking',
  //         'moreDetailTracking',
  //         'shipperAdviceList',
  //         'batchBookPacket',
  //       ],
  //       notes: 'Follow AHL API - Updated.pdf for required fields (vendor_weight_id required for booking).',
  //     };
  //   }
}
