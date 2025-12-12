// src/modules/logistics/integrations/Digi/index.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface';

type Normalized = {
  isSuccess: boolean;
  cn?: string | null;
  slip?: string | null;
  error?: any | null;
  response?: any | null;
  history?: any[] | string;
  status?: any | null;
  date?: any | null;
  remarks?: any | null;
  data?: any;
  raw?: any;
  url?: string | null;
};

/**
 * DigiCourier - NestJS integration for DigiDokaan
 *
 * - Uses HttpService from @nestjs/axios
 * - Uses Nest Logger
 * - Skips DB lookups (you will add CityNameMaping)
 * - Mirrors the logic in the existing JS adapter and DigiDokaan API doc
 */
@Injectable()
export default class DigiCourier implements ICourierService {
  private readonly logger = new Logger(DigiCourier.name);
  private readonly baseURL = 'https://digidokaan.pk/api/v1/digidokaan';
  private readonly httpBasePath = this.baseURL.endsWith('/')
    ? this.baseURL
    : `${this.baseURL}/`;
  private readonly metadata = {
    name: 'AHLCourier',
    allowBulkBooking: false,
  };

  get getMetadata() {
    return this.metadata;
  }

  constructor(private readonly http: HttpService) {}

  // ----------------------- Helpers -----------------------

  private buildUrl(path: string) {
    if (!path) return this.httpBasePath;
    // remove leading slash from path param if present
    if (path.startsWith('/')) path = path.slice(1);
    return `${this.httpBasePath}${path}`;
  }

  private async doGet<T = any>(
    path: string,
    params?: any,
    headers?: any,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(path);
    try {
      this.logger.debug(`Digi GET ${url} params=${JSON.stringify(params)}`);
      const resp = await firstValueFrom(
        this.http.get<T>(url, { params, headers }),
      );
      return resp;
    } catch (err) {
      this.logger.error(
        `Digi GET ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private async doPost<T = any>(
    path: string,
    body?: any,
    headers?: any,
    config?: any,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(path);
    try {
      this.logger.debug(`Digi POST ${url} body=${JSON.stringify(body)}`);
      const resp = await firstValueFrom(
        this.http.post<T>(url, body, { headers, ...config }),
      );
      return resp;
    } catch (err) {
      this.logger.error(
        `Digi POST ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private toError(err: any) {
    return err?.response?.data ?? err?.response ?? err?.message ?? String(err);
  }

  // ----------------------- Token management -----------------------
  // NOTE: your JS uses DB Tokens; you requested skip DB lookups/writes.
  // This implementation tries to use deliveryAccount.tokens[0] if present and not expired,
  // otherwise it will call `login` using deliveryAccount.username/password and return token to caller.
  // You can later replace getToken/saveToken with DB logic.

  private async loginUsingAccount(
    deliveryAccount: any,
  ): Promise<{ token: string; expiry: string } | null> {
    if (!deliveryAccount)
      throw new Error('No deliveryAccount provided for login');
    const phone = deliveryAccount.username;
    const password = deliveryAccount.password;
    if (!phone || !password) return null;

    try {
      // According to JS adapter, login endpoint is: auth/login?phone=...&password=...
      const urlPath = `auth/login?phone=${encodeURIComponent(phone)}&password=${encodeURIComponent(password)}`;
      const resp = await this.doPost(urlPath, null, { Accept: '*/*' });
      const data = resp.data ?? {};
      const { code, token } = data;
      if (code === 200 && token) {
        // expiry one day as legacy code used addDaysToCurrentDate(1)
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        return { token, expiry };
      }
      throw new Error(data?.error ?? data?.msg ?? 'Login failed');
    } catch (err) {
      this.logger.error('Digi loginUsingAccount failed', this.toError(err));
      throw err;
    }
  }

  private async refreshTokenUsingToken(
    token: string,
  ): Promise<{ token: string; expiry: string } | null> {
    try {
      const headers = { Authorization: `Bearer ${token}`, Accept: '*/*' };
      const resp = await this.doPost('auth/refresh_token', null, headers);
      const data = resp.data ?? {};
      const { code, token: refreshedToken } = data;
      if (code === 200 && refreshedToken) {
        const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        return { token: refreshedToken, expiry };
      }
      throw new Error(data?.message ?? 'Token refresh failed');
    } catch (err) {
      this.logger.error(
        'Digi refreshTokenUsingToken failed',
        this.toError(err),
      );
      throw err;
    }
  }

  /**
   * getToken - prefer token from deliveryAccount.tokens[0] (caller may attach),
   * otherwise attempt login -> return token string.
   *
   * NOTE: we do not persist tokens to DB here. If you want DB persistence, plug in Tokens model logic later.
   */
  private async getToken(deliveryAccount: any): Promise<string> {
    try {
      if (!deliveryAccount)
        throw new Error('deliveryAccount required for token');

      // If tokens array present and first token exists, assume valid (your JS used expiry check helpers).
      if (
        deliveryAccount.tokens &&
        Array.isArray(deliveryAccount.tokens) &&
        deliveryAccount.tokens.length > 0
      ) {
        const tokenRecord = deliveryAccount.tokens[0];
        // the JS code used isExpired(token.expiry) - we omit expiry check here because user will add DB logic later.
        if (tokenRecord && tokenRecord.token) return tokenRecord.token;
      }

      // else login with credentials
      const result = await this.loginUsingAccount(deliveryAccount);
      if (result && result.token) {
        // Note: we are not saving token to DB; the caller may choose to save result
        return result.token;
      }
      throw new Error('Unable to obtain token for Digi');
    } catch (err) {
      this.logger.error('Digi getToken failed', this.toError(err));
      throw err;
    }
  }

  /**
   * bookParcel - wrapper for "order-book" endpoint used in JS adapter
   */
  async bookParcel(
    orderDetails: any,
    courierAccount: any,
  ): Promise<Normalized> {
    let resp: AxiosResponse | undefined;
    try {
      const token = await this.getToken(courierAccount);
      const headers = { Accept: '*/*', Authorization: `Bearer ${token}` };

      // NOTE: we are skipping DB city lookup - expect orderDetails to already have destination city id when required
      const buyerNumber = orderDetails.customer?.phone
        ? `+92${String(orderDetails.customer.phone).replace(/^0/, '')}`
        : undefined;
      const buyerName =
        `${orderDetails.customer?.first_name ?? ''} ${orderDetails.customer?.last_name ?? ''}`.trim();
      const productName = Array.isArray(orderDetails.items)
        ? orderDetails.items.map((it) => `${it.name}/${it.quantity}`).join('-')
        : (orderDetails.product_name ?? '');

      // The JS adapter builds a long query string; we'll call the POST endpoint 'order-book' with querystring as in JS
      // For simplicity we use POST to the query path (JS used POST requestOptions.url)
      // Build URL path exactly like JS -> order-book?param1=...&param2=...
      const qsParts: string[] = [];
      qsParts.push(
        `seller_number=${encodeURIComponent(courierAccount.username ?? '')}`,
      );
      qsParts.push(`buyer_number=${encodeURIComponent(buyerNumber ?? '')}`);
      qsParts.push(`buyer_name=${encodeURIComponent(buyerName)}`);
      qsParts.push(
        `buyer_address=${encodeURIComponent(orderDetails.address?.address1 ?? '')}`,
      );
      qsParts.push(
        `buyer_city=${encodeURIComponent(orderDetails.destination_city ?? '')}`,
      ); // expects assigned_id
      qsParts.push(
        `piece=${encodeURIComponent(String(orderDetails.items?.length ?? 1))}`,
      );
      qsParts.push(
        `amount=${encodeURIComponent(String(orderDetails.total_price ?? 0))}`,
      );
      qsParts.push(
        `external_reference_no=${encodeURIComponent(orderDetails.order_number ?? '')}`,
      );
      qsParts.push(
        `weight=${encodeURIComponent(courierAccount.key == '17' ? '0.5' : '0.25')}`,
      ); // copied from JS
      qsParts.push(`product_name=${encodeURIComponent(productName)}`);
      qsParts.push(`shipment_type=1`);
      qsParts.push(
        `special_instruction=${encodeURIComponent(orderDetails.special_instructions ?? 'rush delivery')}`,
      );
      qsParts.push(
        `store_url=${encodeURIComponent(orderDetails.store_url ?? 'sukooon.com')}`,
      );
      qsParts.push(
        `business_name=${encodeURIComponent(orderDetails.business_name ?? 'Sukooon')}`,
      );
      qsParts.push(
        `origin=${encodeURIComponent(orderDetails.origin ?? 'Faisalabad')}`,
      );
      qsParts.push(
        `gateway_id=${encodeURIComponent(courierAccount.key ?? '')}`,
      );
      qsParts.push(
        `shipper_address=${encodeURIComponent(courierAccount.shipper_address ?? '')}`,
      );
      qsParts.push(
        `shipper_name=${encodeURIComponent(courierAccount.shipper_name ?? courierAccount.username ?? '')}`,
      );
      qsParts.push(
        `shipper_phone=${encodeURIComponent(courierAccount.username ?? '')}`,
      );
      qsParts.push(
        `pickup_id=${encodeURIComponent(courierAccount.cost_center ?? '')}`,
      );
      qsParts.push(
        `source=${encodeURIComponent(orderDetails.source ?? 'sukooon')}`,
      );
      qsParts.push(`new_destination_city_check=1`);

      const path = `order-book?${qsParts.join('&')}`;

      resp = await this.doPost(path, null, headers);
      const resData = resp.data ?? {};
      this.logger.log('info', 'Digi bookParcel response', { res: resData });

      const { code, msg, data, message, status, error } = resData;
      if (code === 200) {
        const {
          tracking_no,
          delivery_charges,
          slip_link,
          load_sheet_id,
          order_no,
          pdf_link,
        } = data ?? {};
        return {
          cn: tracking_no ?? null,
          slip:
            slip_link ??
            JSON.stringify({
              order_no,
              load_sheet_id,
              pdf_link,
              delivery_charges,
            }),
          isSuccess: true,
          error: null,
          response: msg ?? message ?? 'Booked',
          raw: resData,
        };
      }

      // non-200
      return {
        cn: null,
        slip: JSON.stringify({ error }),
        isSuccess: false,
        error: error ?? message ?? msg ?? 'Booking failed',
        response: message ?? msg ?? code,
        raw: resData,
      };
    } catch (err) {
      this.logger.error('Digi bookParcel exception', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: data?.error ?? data?.message ?? this.toError(err),
        response: data?.message ?? 'Error while booking parcel',
        raw: data ?? err,
      };
    }
  }

  /**
   * checkParcelStatus - uses endpoint 'get-order-tracking' (JS used POST)
   */
  async checkParcelStatus(
    cn: string | string[],
    courierAccount: any,
  ): Promise<Normalized> {
    let resp: AxiosResponse | undefined;
    try {
      const token = await this.getToken(courierAccount);
      const headers = { Accept: '*/*', Authorization: `Bearer ${token}` };

      // JS used: get-order-tracking?tracking_no=...
      const tn = Array.isArray(cn) ? cn.join(',') : cn;
      const path = `get-order-tracking?tracking_no=${encodeURIComponent(String(tn))}`;

      // In JS they called request with method POST but url containing query string; we do the same pattern (POST to that path, no body)
      resp = await this.doPost(path, null, headers);
      const resData = resp.data ?? {};
      this.logger.log('info', 'Digi checkParcelStatus response', {
        res: resData,
      });

      const { code, msg, tracking_number, data, error } = resData;
      if (code === 200) {
        // return history as returned (JS stringified data). We return both parsed data and stringified for compatibility
        return {
          isSuccess: true,
          error: null,
          history: data ?? [],
          status: '', // digi doesn't return single status; client can inspect history
          date: new Date().toISOString(),
          remarks: null,
          data,
          response: msg ?? 'Tracking success',
          raw: resData,
        };
      }

      return {
        isSuccess: false,
        error: error ?? msg ?? 'Tracking failed',
        history: data ?? [],
        status: null,
        date: null,
        remarks: null,
        data,
        response: msg ?? 'Tracking failed',
        raw: resData,
      };
    } catch (err) {
      this.logger.error('Digi checkParcelStatus error', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return {
        isSuccess: false,
        error: data ?? this.toError(err),
        history: [],
        status: null,
        date: null,
        remarks: null,
        data: data ?? {},
        response: 'Error in fetching current booking status!',
        raw: data ?? err,
      };
    }
  }

  /**
   * cancelBooking - Digi does not provide cancel booking in JS adapter; return not supported
   */
  async cancelBooking(cn: string, courierAccount: any): Promise<Normalized> {
    return {
      isSuccess: false,
      error: 'Cancel booking not available for Digi courier',
      response: cn,
      raw: null,
    };
  }

  /**
   * downloadReceipt - A best-effort: return slip link if available by hitting invoice/pdf endpoint (JS returned pdf_link in booking)
   */
  async downloadReceipt(
    cns: string[],
    courierAccount: any,
  ): Promise<Normalized> {
    try {
      // If booking returned pdf_link in earlier bookParcel, you should use that.
      // We'll try to build a path that might return invoice/pdf; if not available, consumer must use slip from booking response.
      const tn = Array.isArray(cns) ? cns[0] : cns;
      // example path guess - replace if Digi doc gives explicit path
      const path = `order-invoice?order_no=${encodeURIComponent(String(tn))}`;
      const token = await this.getToken(courierAccount);
      const headers = { Accept: '*/*', Authorization: `Bearer ${token}` };

      const resp = await this.doGet(path, null, headers);
      const data = resp.data ?? {};
      // maybe returns URL or binary; if returns URL, return it; if PDF, consumer can use response.data binary (not implemented here)
      const invoiceUrl = data?.data ?? data?.pdf_link ?? data?.url ?? null;
      if (invoiceUrl) {
        return {
          isSuccess: true,
          url: invoiceUrl as any,
          response: 'Invoice URL',
          raw: data,
        };
      }
      return { isSuccess: false, error: 'Invoice not found', raw: data };
    } catch (err) {
      this.logger.error('Digi downloadReceipt error', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return {
        isSuccess: false,
        error: data ?? this.toError(err),
        raw: data ?? err,
      };
    }
  }

  /**
   * batchBookParcels - Digi JS adapter doesn't have bulk endpoint; fallback sequential booking
   */
  async batchBookParcels(orders: any[], courierAccount: any): Promise<any> {
    const results: any[] = [];
    for (const ord of orders) {
      // sequential to avoid rate limit issues
      // eslint-disable-next-line no-await-in-loop
      const res = await this.bookParcel(ord, courierAccount);
      results.push(res);
    }
    return { isSuccess: true, results };
  }

  /**
   * downloadLoadSheet - not explicitly in Digi doc; provide stub
   */
  async downloadLoadSheet(
    loadSheetId: number,
    courierAccount: any,
    responseType: 'PDF' | 'JSON' = 'JSON',
  ): Promise<any> {
    return {
      isSuccess: false,
      error: 'downloadLoadSheet not implemented for Digi',
      raw: null,
    };
  }

  /**
   * getCities - wrap Digi get-cities endpoint if exists (JS had getCities placeholder)
   */
  async getAllCities(courierAccount: any): Promise<Normalized> {
    try {
      const token = await this.getToken(courierAccount);
      const headers = { Accept: '*/*', Authorization: `Bearer ${token}` };
      const resp = await this.doGet('get-cities', null, headers);
      const data = resp.data ?? {};
      // expected response likely contains list in data or cities
      return {
        isSuccess: true,
        data: data?.data ?? data?.cities ?? data,
        raw: data,
      };
    } catch (err) {
      this.logger.error('Digi getAllCities error', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return { isSuccess: false, error: data ?? this.toError(err), raw: data };
    }
  }

  // Additional convenience methods used by other adapters/projects can be added here if needed
}
