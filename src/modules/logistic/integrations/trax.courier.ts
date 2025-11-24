// src/modules/logistics/integrations/Trax/index.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface'; // adjust path if needed

/**
 * Trax / Sonic courier integration (NestJS)
 * - Implements endpoints listed in Sonic API doc (Version 2.0).
 * - Uses HttpService from @nestjs/axios and Nest Logger.
 *
 * Reference: API Document - SONIC Version 2.0.pdf. :contentReference[oaicite:2]{index=2}
 */
@Injectable()
export default class TraxCourier implements ICourierService {
  private readonly logger = new Logger(TraxCourier.name);
  private readonly baseUrl = 'https://sonic.pk/api/';

  constructor(private readonly http: HttpService) {}

  // ---------------- Helpers ----------------

  private async get<T = any>(
    path: string,
    deliveryAccount?: any,
    params?: Record<string, any>,
  ) {
    const url = this.baseUrl + path;
    try {
      const config: any = { headers: {}, params: params || {} };
      if (deliveryAccount?.key)
        config.headers['Authorization'] = deliveryAccount.key;
      this.logger.debug(`GET ${url} params=${JSON.stringify(config.params)}`);
      const resp = await firstValueFrom(this.http.get<T>(url, config));
      return resp;
    } catch (err) {
      this.logger.error(
        `GET ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private async post<T = any>(
    path: string,
    body: any = {},
    deliveryAccount?: any,
    params?: Record<string, any>,
    requestConfig: any = {},
  ) {
    const url = this.baseUrl + path;
    try {
      const config: any = {
        headers: { 'Content-Type': 'application/json' },
        params: params || {},
        ...requestConfig,
      };
      if (deliveryAccount?.key)
        config.headers['Authorization'] = deliveryAccount.key;
      this.logger.debug(`POST ${url} body=${JSON.stringify(body)}`);
      const resp = await firstValueFrom(this.http.post<T>(url, body, config));
      return resp;
    } catch (err) {
      this.logger.error(
        `POST ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private normalizeStatusResponse(apiResp: any) {
    // Sonic uses { status: 0, message: "...", ... }. status===0 => success
    const status = apiResp?.status;
    const isSuccess = Number(status) === 0;
    return {
      isSuccess,
      response: apiResp?.message ?? null,
      raw: apiResp,
      error: isSuccess ? null : (apiResp?.message ?? apiResp?.error ?? null),
    };
  }

  // ---------------- Core methods ----------------

  /**
   * Book a shipment.
   * Uses endpoint: POST /shipment/book
   * Refer: Sonic API doc - Book a Shipment. :contentReference[oaicite:3]{index=3}
   */
  async bookParcel(order: any, deliveryAccount: any) {
    try {
      // Build payload consistent with PDF & your JS example.
      // You will add DB city mapping later; here we assume order.address.city_id or deliveryAccount provides city ids.
      const body = {
        service_type_id: order.service_type_id ?? 1,
        pickup_address_id:
          deliveryAccount?.cost_center ?? order.pickup_address_id ?? 0,
        information_display: order.information_display ?? 1,
        consignee_city_id:
          order.destination_city_id ??
          order.address?.city_id ??
          order.address?.city ??
          0,
        consignee_name:
          `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim(),
        consignee_address: order.address?.address1 ?? '',
        consignee_phone_number_1: order.customer?.phone
          ? String(order.customer.phone).replace(/^0/, '0')
          : '',
        consignee_email_address: order.customer?.email ?? '',
        order_id: order.order_number ? String(order.order_number) : undefined,
        item_product_type_id: order.item_product_type_id ?? 24, // 'Other' default per appendix
        item_description: Array.isArray(order.items)
          ? order.items.map((i) => `${i.name}/${i.quantity}`).join(' - ')
          : (order.item_description ?? ''),
        item_quantity: order.items?.length ?? 1,
        item_insurance: order.item_insurance ?? 0,
        item_price: order.total_price ?? 0,
        pickup_date:
          order.pickup_date ?? new Date().toISOString().split('T')[0],
        special_instructions: order.special_instructions ?? 'Rush Delivery',
        estimated_weight: order.estimated_weight ?? order.weight ?? 0.25,
        shipping_mode_id: order.shipping_mode_id ?? 1,
        same_day_timing_id: order.same_day_timing_id,
        amount: order.total_price ?? 0,
        payment_mode_id: order.payment_mode_id ?? 1,
        charges_mode_id: order.charges_mode_id ?? 2,
        open_shipment: order.open_shipment ?? 0,
        pieces_quantity: order.pieces ?? 1,
        shipper_reference_number_1: order.shipper_reference_number_1 ?? '',
      };

      const resp = await this.post('shipment/book', body, deliveryAccount);
      const data = resp.data ?? {};

      // Sonic returns { status: 0, message: "Shipment has been Booked!", "tracking number": "..." }
      // Some doc examples show a "tracking number" field; some returns TrackNo etc. Normalize both.
      const trackingNumber =
        data?.['tracking number'] ??
        data?.tracking_number ??
        data?.TrackNo ??
        null;
      const normalized = this.normalizeStatusResponse(data);

      return {
        cn: trackingNumber,
        slip: JSON.stringify(data),
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.response,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('bookParcel error', data);
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: data?.message ?? err?.message,
        response: 'Error creating booking',
        raw: data,
      };
    }
  }

  /**
   * checkParcelStatus / current status endpoint
   * GET /shipment/status?tracking_number=...&type=0
   */
  async checkParcelStatus(
    trackingNumber: string | string[],
    deliveryAccount?: any,
  ) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : String(trackingNumber);
      const params = { tracking_number: tn, type: 0 };
      const resp = await this.get('shipment/status', deliveryAccount, params);
      const data = resp.data ?? {};
      const normalized = this.normalizeStatusResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        status: data?.current_status ?? null,
        date: null,
        remarks: null,
        data,
        response: normalized.response,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('checkParcelStatus error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        status: null,
        data,
        response: 'Error in fetching current booking status!',
      };
    }
  }

  /**
   * Tracking details (full)
   * GET /shipment/track?tracking_number=...&type=0
   */
  async trackParcel(trackingNumber: string | string[], deliveryAccount?: any) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : String(trackingNumber);
      const params = { tracking_number: tn, type: 0 };
      const resp = await this.get('shipment/track', deliveryAccount, params);
      const data = resp.data ?? {};
      const details = data?.details ?? {};
      const history = details?.tracking_history ?? [];
      return {
        isSuccess: Number(data?.status) === 0,
        error: Number(data?.status) === 0 ? null : (data?.message ?? null),
        history,
        status: history?.[0]?.status ?? null,
        date: history?.[0]?.date_time ?? null,
        remarks: history?.[0]?.status_reason ?? null,
        data: details,
        response: data?.message ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('trackParcel error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        history: [],
        response: 'Error in tracking parcel',
        raw: data,
      };
    }
  }

  /**
   * Cancel booking
   * POST /shipment/cancel { tracking_number }
   */
  async cancelBooking(
    trackingNumber: string | string[],
    deliveryAccount?: any,
  ) {
    try {
      const body = {
        tracking_number: Array.isArray(trackingNumber)
          ? trackingNumber.join(',')
          : String(trackingNumber),
      };
      const resp = await this.post('shipment/cancel', body, deliveryAccount);
      const data = resp.data ?? {};
      const normalized = this.normalizeStatusResponse(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.response,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('cancelBooking error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        response: 'Error in cancelling booking',
        raw: data,
      };
    }
  }

  /**
   * Printing / download airway bill (consignment note)
   * GET /shipment/air_waybill?tracking_number=...&type=0|1
   * If type=1 => PDF, type=0 => jpeg
   */
  async downloadReceipt(
    trackingNumber: string | string[],
    deliveryAccount: any,
    type: 1 | 0 = 1,
  ) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : String(trackingNumber);
      const params = { tracking_number: tn, type };
      // If requesting PDF we should use arraybuffer
      const resp = await firstValueFrom(
        this.http.get(this.baseUrl + 'shipment/air_waybill', {
          params,
          headers: deliveryAccount?.key
            ? { Authorization: deliveryAccount.key }
            : {},
          responseType: type === 1 ? 'arraybuffer' : 'json',
        }),
      );
      return {
        isSuccess: true,
        data: resp.data,
        response: 'Air waybill fetched',
        raw: resp.data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('downloadReceipt error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        response: 'Error fetching airway bill',
        raw: data,
      };
    }
  }

  /**
   * Get charges for a shipment
   * GET /shipment/charges?tracking_number=...
   */
  async getCharges(trackingNumber: string | string[], deliveryAccount?: any) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : String(trackingNumber);
      const params = { tracking_number: tn };
      const resp = await this.get('shipment/charges', deliveryAccount, params);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        error: data?.message ?? null,
        charges: data?.charges ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getCharges error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Get payment status
   * GET /shipment/payment_status?tracking_number=...
   */
  async getPaymentStatus(
    trackingNumber: string | string[],
    deliveryAccount?: any,
  ) {
    try {
      const tn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : String(trackingNumber);
      const params = { tracking_number: tn };
      const resp = await this.get(
        'shipment/payment_status',
        deliveryAccount,
        params,
      );
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        error: data?.message ?? null,
        current_payment_status: data?.current_payment_status ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getPaymentStatus error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Multiple payments details
   * GET /payments?tracking_number[]=...
   */
  async getPayments(trackingNumbers: string[] | string, deliveryAccount?: any) {
    try {
      const params: any = {};
      if (Array.isArray(trackingNumbers)) {
        // Sonic expects tracking_number[] style; axios will serialize array params properly by default
        params['tracking_number[]'] = trackingNumbers;
      } else {
        params['tracking_number[]'] = [trackingNumbers];
      }
      const resp = await this.get('payments', deliveryAccount, params);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        payments: data?.payments ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getPayments error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Get invoice / payment by id & type
   * GET /invoice?id=...&type=1
   */
  async getInvoice(id: number, type: 1 | 2, deliveryAccount?: any) {
    try {
      const params = { id, type };
      const resp = await this.get('invoice', deliveryAccount, params);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        payments: data?.payments ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getInvoice error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Charges calculator
   * POST /charges_calculate
   */
  async calculateCharges(payload: any, deliveryAccount?: any) {
    try {
      const resp = await this.post(
        'charges_calculate',
        payload,
        deliveryAccount,
      );
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        information: data?.information ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('calculateCharges error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Create receiving sheet - POST /receiving_sheet/create
   */
  async createReceivingSheet(trackingNumbers: string[], deliveryAccount?: any) {
    try {
      const body = { tracking_numbers: trackingNumbers };
      const resp = await this.post(
        'receiving_sheet/create',
        body,
        deliveryAccount,
      );
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        receiving_sheet_id: data?.receiving_sheet_id ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('createReceivingSheet error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * View receiving sheet - GET /receiving_sheet/view?receiving_sheet_id=...&type=0|1
   */
  async viewReceivingSheet(
    receivingSheetId: number,
    type: 0 | 1 = 0,
    deliveryAccount?: any,
  ) {
    try {
      const params = { receiving_sheet_id: receivingSheetId, type };
      // If type === 1 (PDF) you might want binary response
      const resp = await firstValueFrom(
        this.http.get(this.baseUrl + 'receiving_sheet/view', {
          params,
          headers: deliveryAccount?.key
            ? { Authorization: deliveryAccount.key }
            : {},
          responseType: type === 1 ? 'arraybuffer' : 'json',
        }),
      );
      return { isSuccess: true, data: resp.data, raw: resp.data };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('viewReceivingSheet error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Order ID tracking - GET /shipment/track/order_id?order_id=...&type=0
   */
  async trackByOrderId(
    orderId: string | number,
    deliveryAccount?: any,
    type: 0 | 1 = 0,
  ) {
    try {
      const params = { order_id: orderId, type };
      const resp = await this.get(
        'shipment/track/order_id',
        deliveryAccount,
        params,
      );
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        details: data?.details ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('trackByOrderId error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Shipment status by order id - GET /shipment/status/order_id?order_id=...&type=0
   */
  async statusByOrderId(
    orderId: string | number,
    deliveryAccount?: any,
    type: 0 | 1 = 0,
  ) {
    try {
      const params = { order_id: orderId, type };
      const resp = await this.get(
        'shipment/status/order_id',
        deliveryAccount,
        params,
      );
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        details: data?.details ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('statusByOrderId error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Request RCP (Return Confirm / Re-attempt / Intercept & rebook)
   * POST /request/rcp
   */
  async requestRcp(payload: any, deliveryAccount?: any) {
    try {
      const resp = await this.post('request/rcp', payload, deliveryAccount);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        response: data?.message ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('requestRcp error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * CRM request (complaint/service/claim)
   * POST /request/crm
   */
  async createCrmRequest(payload: any, deliveryAccount?: any) {
    try {
      const resp = await this.post('request/crm', payload, deliveryAccount);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        id: data?.id ?? null,
        response: data?.message ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('createCrmRequest error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Create claim (same endpoint /request/crm with claim params per doc)
   */
  async createClaim(payload: any, deliveryAccount?: any) {
    return this.createCrmRequest(payload, deliveryAccount);
  }

  // ---------------- Pickup address helpers ----------------

  /**
   * Add pickup address - POST /pickup_address/add
   */
  async addPickupAddress(payload: any, deliveryAccount?: any) {
    try {
      const resp = await this.post(
        'pickup_address/add',
        payload,
        deliveryAccount,
      );
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        id: data?.id ?? null,
        response: data?.message ?? null,
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('addPickupAddress error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * List pickup addresses - GET /pickup_addresses
   */
  async getPickupAddresses(deliveryAccount?: any) {
    try {
      const resp = await this.get('pickup_addresses', deliveryAccount);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        pickup_addresses: data?.pickup_addresses ?? [],
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getPickupAddresses error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  /**
   * Cities - GET /cities
   */
  async getCities(deliveryAccount?: any) {
    try {
      const resp = await this.get('cities', deliveryAccount);
      const data = resp.data ?? {};
      return {
        isSuccess: Number(data?.status) === 0,
        cities: data?.cities ?? [],
        raw: data,
      };
    } catch (err) {
      const data = err?.response?.data ?? {};
      this.logger.error('getCities error', data);
      return {
        isSuccess: false,
        error: data?.message ?? err?.message,
        raw: data,
      };
    }
  }

  // ---------------- Utility ----------------

  /**
   * Download load sheet stub - Sonic has receiving_sheet endpoints instead.
   */
  async downloadLoadSheet(
    loadSheetId: number,
    deliveryAccount?: any,
    responseType: 'PDF' | 'JSON' = 'JSON',
  ) {
    return this.viewReceivingSheet(
      loadSheetId,
      responseType === 'PDF' ? 1 : 0,
      deliveryAccount,
    );
  }

  /**
   * Metadata about implemented endpoints
   */
  getMetadata() {
    return {
      baseUrl: this.baseUrl,
      implemented: [
        'bookParcel',
        'trackParcel',
        'checkParcelStatus',
        'cancelBooking',
        'downloadReceipt',
        'getCharges',
        'getPaymentStatus',
        'getPayments',
        'getInvoice',
        'calculateCharges',
        'createReceivingSheet',
        'viewReceivingSheet',
        'trackByOrderId',
        'statusByOrderId',
        'requestRcp',
        'createCrmRequest',
        'createClaim',
        'addPickupAddress',
        'getPickupAddresses',
        'getCities',
      ],
      doc: 'Sonic API Doc (Version 2.0) used as reference.',
    };
  }
}
