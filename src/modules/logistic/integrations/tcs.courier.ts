// src/modules/logistics/integrations/TCS/index.ts
import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface';

/**
 * TCS Courier integration (NestJS)
 *
 * - Implements the same behavior as your existing JS adapter.
 * - Uses HttpService + firstValueFrom for HTTP calls.
 * - Uses Nest Logger.
 * - Token DB read/write points are marked with TODOs (you requested I don't implement DB logic).
 *
 * Endpoints used (from your JS):
 *  - GET  /auth/api/auth?ClientID=...&ClientSecret=...    -> header token
 *  - GET  /ecom/api/authentication/token?username=...     -> body token
 *  - POST /ecom/api/booking/create                        -> booking
 *  - GET  /tracking/api/Tracking/GetDynamicTrackDetail?consignee=... -> tracking
 *  - POST /ecom/api/booking/cancel                        -> cancel
 *
 * Place: src/modules/logistics/integrations/TCS/index.ts
 */
@Injectable()
export default class TCSCourier implements ICourierService {
  private readonly logger = new Logger(TCSCourier.name);
  private readonly baseURL = 'https://connect.tcscourier.com'; // adjust to dev if needed

  private readonly metadata = {
    name: 'MnpCourier',
    allowBulkBooking: false,
  };

  get getMetadata() {
    return this.metadata;
  }

  constructor(private readonly http: HttpService) {}

  /* ------------------------ Helpers ------------------------ */

  private buildUrl(path: string) {
    if (!path) return this.baseURL;
    if (path.startsWith('/')) path = path.slice(1);
    return `${this.baseURL}/${path}`;
  }

  private async httpGet<T = any>(
    path: string,
    params?: any,
    headers?: any,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(path);
    try {
      this.logger.debug(`TCS GET ${url} params=${JSON.stringify(params)}`);
      const resp = await firstValueFrom(
        this.http.get<T>(url, { params, headers }),
      );
      return resp;
    } catch (err) {
      this.logger.error(
        `TCS GET ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private async httpPost<T = any>(
    path: string,
    body?: any,
    headers?: any,
    config?: any,
  ): Promise<AxiosResponse<T>> {
    const url = this.buildUrl(path);
    try {
      this.logger.debug(`TCS POST ${url} body=${JSON.stringify(body)}`);
      const resp = await firstValueFrom(
        this.http.post<T>(url, body, { headers, ...config }),
      );
      return resp;
    } catch (err) {
      this.logger.error(
        `TCS POST ${url} failed`,
        err?.response?.data ?? err?.message ?? err,
      );
      throw err;
    }
  }

  private toError(err: any) {
    return err?.response?.data ?? err?.response ?? err?.message ?? String(err);
  }

  /* ------------------------ Token helpers ------------------------
   * Behavior:
   * - Try reading from deliveryAccount.tokens[] if provided
   * - If tokens missing or expired, attempt to fetch using API and save via saveTokensForAccount (TODO)
   * - getTokensFromAccount returns { headerToken, bodyToken } or throws
   * ----------------------------------------------------------------
   */

  /**
   * Fetch header token from TCS (ClientID, ClientSecret)
   */
  private async fetchHeaderToken(clientId: string, clientSecret: string) {
    const path = `auth/api/auth`;
    const params = { ClientID: clientId, ClientSecret: clientSecret };
    try {
      const resp = await this.httpGet(path, params);
      // Response shape per JS: res.data.result.accessToken, result.expiry
      const result = resp.data?.result ?? {};
      return {
        token: result?.accessToken ?? null,
        expiry: result?.expiry ?? null,
        raw: resp.data,
      };
    } catch (err) {
      this.logger.error('fetchHeaderToken error', this.toError(err));
      throw err;
    }
  }

  /**
   * Fetch body token using header token, username, password
   */
  private async fetchBodyToken(
    headerToken: string,
    username: string,
    password: string,
  ) {
    const path = `ecom/api/authentication/token`;
    const params = { username, password };
    const headers = { Authorization: `Bearer ${headerToken}`, Accept: '*/*' };
    try {
      const resp = await this.httpGet(path, params, headers);
      // Response shape per JS: res.data.accesstoken, res.data.expiry
      const data = resp.data ?? {};
      return {
        token: data?.accesstoken ?? null,
        expiry: data?.expiry ?? null,
        raw: data,
      };
    } catch (err) {
      this.logger.error('fetchBodyToken error', this.toError(err));
      throw err;
    }
  }

  /**
   * Save tokens for an account (DB write)
   * NOTE: per your request, DO NOT implement DB writes here.
   * Replace TODOs with your DB logic.
   */
  private async saveTokensForAccount(
    accountId: number,
    headerTokenObj: any,
    bodyTokenObj: any,
  ) {
    // TODO: Implement DB logic to save tokens in your Tokens table.
    // Example desired behavior:
    //  - delete existing tokens for accountId (or upsert)
    //  - create tokens with shape { account_id, token, expiry, type: 'header' | 'body' }
    //
    // e.g.
    // await Tokens.destroy({ where: { account_id }});
    // await Tokens.bulkCreate([{ account_id, token: headerToken, expiry: headerExpiry, type: 'header'}, {...body...}]);
    //
    // For now we just log and return.
    this.logger.debug(
      'saveTokensForAccount called (TODO - implement DB write)',
      {
        accountId,
        headerTokenObj,
        bodyTokenObj,
      },
    );
    return true;
  }

  /**
   * Get tokens from deliveryAccount object or fetch & save them
   *
   * Expected deliveryAccount.tokens format (JS): [{ type: 'header'|'body', token, expiry }, ...]
   *
   * Behavior:
   *  - if deliveryAccount.tokens defined and non-empty: return those tokens (but still you might validate expiry)
   *  - else fetch header token using clientId/secret in deliveryAccount and then body token using header token
   *  - save tokens via saveTokensForAccount (TODO)
   */
  private async getTokensFromAccount(
    deliveryAccount: any,
  ): Promise<{ headerToken: string; bodyToken: string }> {
    // 1) If tokens present on deliveryAccount, prefer them (JS code uses them and throws if missing)
    if (
      deliveryAccount?.tokens &&
      Array.isArray(deliveryAccount.tokens) &&
      deliveryAccount.tokens.length > 0
    ) {
      // Optionally validate expiry here; in JS they used isDateToday() to check expiry. We'll trust caller or DB.
      const headerObj = deliveryAccount.tokens.find(
        (t: any) => t.type === 'header',
      );
      const bodyObj = deliveryAccount.tokens.find(
        (t: any) => t.type === 'body',
      );
      if (!headerObj || !bodyObj) {
        // fallthrough to fetch
        this.logger.warn(
          'TCS tokens found but header/body missing - will attempt to fetch new tokens',
        );
      } else {
        return { headerToken: headerObj.token, bodyToken: bodyObj.token };
      }
    }

    // 2) If tokens not present or incomplete, fetch them using credentials on deliveryAccount.
    // deliveryAccount should contain: client_id, client_secret, username, password, id (account id)
    const clientId =
      deliveryAccount?.client_id ??
      deliveryAccount?.ClientID ??
      deliveryAccount?.clientId ??
      deliveryAccount?.id;
    const clientSecret =
      deliveryAccount?.client_secret ??
      deliveryAccount?.ClientSecret ??
      deliveryAccount?.clientSecret ??
      deliveryAccount?.secret;
    const username = deliveryAccount?.username;
    const password = deliveryAccount?.password;

    if (!clientId || !clientSecret) {
      throw new Error('TCS client credentials not provided on deliveryAccount');
    }
    if (!username || !password) {
      throw new Error('TCS username/password not provided on deliveryAccount');
    }

    // Fetch header token
    const headerTokenObj = await this.fetchHeaderToken(clientId, clientSecret);
    if (!headerTokenObj?.token) {
      throw new Error('Failed to fetch TCS header token');
    }

    // Fetch body token
    const bodyTokenObj = await this.fetchBodyToken(
      headerTokenObj.token,
      username,
      password,
    );
    if (!bodyTokenObj?.token) {
      throw new Error('Failed to fetch TCS body token');
    }

    // Save fetched tokens to DB (TODO)
    try {
      // If deliveryAccount has an identifier for account id, pass it; otherwise skip DB save but log
      const accountId = deliveryAccount?.id ?? null;
      // TODO: implement DB writes in saveTokensForAccount
      await this.saveTokensForAccount(accountId, headerTokenObj, bodyTokenObj);
    } catch (saveErr) {
      // Log save errors but do not fail the flow — DB write is optional at runtime
      this.logger.warn(
        'TCS token saveTokensForAccount (TODO) failed or not implemented',
        this.toError(saveErr),
      );
    }

    return { headerToken: headerTokenObj.token, bodyToken: bodyTokenObj.token };
  }

  /* ------------------------ ICourierService Implementation ------------------------ */

  /**
   * bookParcel - creates booking
   * Implements same request shape as your JS adapter
   */
  async bookParcel(order: any, deliveryAccount: any): Promise<any> {
    let response: AxiosResponse | undefined;
    let body: any;
    try {
      // NOTE: skip DB city lookup; you will add mapping in your integration.
      // destinationCity.maped expected (your JS uses CityNameMaping)
      // const destinationCity = await CityNameMaping.findOne(...)

      // Ensure tokens exist or fetch them
      const { headerToken, bodyToken } =
        await this.getTokensFromAccount(deliveryAccount);

      // Build request body per JS
      body = {
        accessToken: bodyToken,
        consignmentno: '',
        shipperinfo: {
          // These hard-coded shipper fields were present in your JS. Replace as needed or pull from deliveryAccount.
          tcsaccount: deliveryAccount?.tcs_account ?? '759776',
          shippername: deliveryAccount?.shipper_name ?? 'Sukoon welness',
          address1:
            deliveryAccount?.shipper_address1 ?? 'madina town faislabad',
          address2: deliveryAccount?.shipper_address2 ?? '',
          address3: '',
          zip: deliveryAccount?.shipper_zip ?? '38000',
          countrycode: 'PK',
          countryname: 'Pakistan',
          citycode: '',
          cityname: deliveryAccount?.shipper_city ?? 'FAISALABAD',
          mobile: deliveryAccount?.shipper_mobile ?? '03227276200',
        },
        consigneeinfo: {
          consigneecode: '',
          firstname: order.customer?.first_name ?? '',
          middlename: '',
          lastname: order.customer?.last_name ?? '',
          address1: order.address?.address1 ?? '',
          address2: '',
          address3: '',
          zip: order.address?.zip ?? '',
          countrycode: 'PK',
          countryname: 'Pakistan',
          citycode: '',
          cityname: order.destination_city ?? order.address?.city ?? '', // map this beforehand
          email: order.customer?.email ?? '',
          areacode: '',
          areaname: '',
          blockcode: '',
          blockname: '',
          lat: '',
          lng: '',
          mobile: order.customer?.phone
            ? `0${String(order.customer.phone).replace(/^0/, '')}`
            : '',
        },
        vendorinfo: {
          name: deliveryAccount?.vendor_name ?? 'SUKOON WELLNESS & CO',
          address1: deliveryAccount?.vendor_address1 ?? 'madina town faislabad',
          address2: '',
          address3: '',
          citycode: deliveryAccount?.vendor_citycode ?? 'FSD',
          cityname: deliveryAccount?.vendor_cityname ?? 'FAISALABAD',
          mobile: deliveryAccount?.vendor_mobile ?? '03227276200',
        },
        shipmentinfo: {
          costcentercode: deliveryAccount?.cost_center ?? '',
          referenceno: `${order.order_number ?? ''}`,
          contentdesc: Array.isArray(order.items)
            ? order.items.map((c) => `${c.name}/${c.quantity}`).join('-')
            : (order.items?.toString() ?? ''),
          servicecode: deliveryAccount?.servicecode ?? 'O',
          parametertype: '',
          shipmentdate: `${new Date().toLocaleString('en-GB', { hour12: false }).replace(',', '')}`,
          shippingtype: '',
          currency: 'PKR',
          codamount: order.total_price ?? 0,
          declaredvalue: '',
          insuredvalue: '',
          transactiontype: '',
          dsflag: '',
          carrierslug: '',
          weightinkg: order.weightKg ?? order.weight ?? 0.5,
          pieces: order.items?.length ?? 1,
          fragile: false,
          remarks: Array.isArray(order.items)
            ? order.items.map((c) => `${c.name}/${c.quantity}`).join('-')
            : '',
          skus: [],
        },
      };

      // Make HTTP call with header token
      response = await this.httpPost('ecom/api/booking/create', body, {
        Authorization: `Bearer ${headerToken}`,
      });

      this.logger.log('info', 'tcs book parcel api response', {
        res: response?.data,
        body,
      });
      const { consignmentNo, message, traceid } = response?.data || {};
      return {
        cn: consignmentNo ?? null,
        slip: JSON.stringify({ traceid }),
        isSuccess: message === 'SUCCESS',
        error: message === 'SUCCESS' ? null : message,
        response: message ?? null,
        raw: response?.data ?? null,
      };
    } catch (err) {
      this.logger.error('bookParcel error', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: data?.message ?? this.toError(err),
        response: data?.message ?? 'Error in booking parcel',
        raw: data ?? err,
      };
    }
  }

  /**
   * checkParcelStatus - GET /tracking/api/Tracking/GetDynamicTrackDetail?consignee={trackingNumber}
   */
  async checkParcelStatus(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ): Promise<any> {
    let response: AxiosResponse | undefined;
    try {
      const { headerToken } = await this.getTokensFromAccount(deliveryAccount);
      const params = {
        consignee: Array.isArray(trackingNumber)
          ? trackingNumber.join(',')
          : trackingNumber,
      };
      response = await this.httpGet(
        'tracking/api/Tracking/GetDynamicTrackDetail',
        params,
        { Authorization: `Bearer ${headerToken}` },
      );

      const {
        shipmentinfo,
        deliveryinfo,
        checkpoints,
        shipmentsummary,
        message,
        traceid,
      } = response.data ?? {};
      return {
        isSuccess: message === 'SUCCESS',
        error: message === 'SUCCESS' ? null : message,
        history: checkpoints ?? [],
        status:
          checkpoints && checkpoints.length > 0
            ? (checkpoints[0]?.status ?? null)
            : null,
        date: null,
        remarks: shipmentsummary ?? null,
        data: { shipmentinfo, deliveryinfo, shipmentsummary },
        response: 'Current Booking status!',
        raw: response.data,
      };
    } catch (err) {
      this.logger.error('checkParcelStatus error', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return {
        isSuccess: false,
        data: {},
        history: [],
        status: null,
        date: null,
        remarks: null,
        error: data ?? this.toError(err),
        response: 'Error in getting booking status!',
        raw: data ?? err,
      };
    }
  }

  /**
   * cancelBooking - POST /ecom/api/booking/cancel
   */
  async cancelBooking(
    trackingNumber: string,
    deliveryAccount: any,
  ): Promise<any> {
    let response: AxiosResponse | undefined;
    let body: any;
    try {
      const { headerToken, bodyToken } =
        await this.getTokensFromAccount(deliveryAccount);
      body = {
        consignmentnumber: trackingNumber,
        accesstoken: bodyToken,
      };
      response = await this.httpPost('ecom/api/booking/cancel', body, {
        Authorization: `Bearer ${headerToken}`,
      });

      const { message, traceid } = response?.data ?? {};
      return {
        isSuccess: Boolean(message === 'SUCCESS'),
        error: message === 'SUCCESS' ? null : message,
        response: message ?? null,
        raw: response?.data ?? null,
      };
    } catch (err) {
      this.logger.error('cancelBooking error', this.toError(err));
      const data = (err as any)?.response?.data ?? null;
      return {
        isSuccess: false,
        error: data?.message ?? this.toError(err),
        response: data?.message ?? 'Error cancelling booking',
        raw: data ?? err,
      };
    }
  }

  /**
   * downloadReceipt - stub as requested (Option A)
   * TODO: implement if you know the exact TCS endpoint that returns PDF or slip URL
   */
  async downloadReceipt(cns: string[], deliveryAccount: any): Promise<any> {
    // We return a TODO response so caller knows to replace with real implementation.
    return {
      isSuccess: false,
      error:
        'downloadReceipt not implemented - TODO: add TCS invoice/slip endpoint integration here',
      response: null,
      raw: null,
    };
  }

  /* ---------------- Optional helpers matching ICourierService ---------------- */

  /**
   * batchBookParcels fallback (if required)
   */
  async batchBookParcels(orders: any[], deliveryAccount: any): Promise<any> {
    const results: any[] = [];
    for (const o of orders) {
      // sequential to avoid rate limits
      // eslint-disable-next-line no-await-in-loop
      const res = await this.bookParcel(o, deliveryAccount);
      results.push(res);
    }
    return { isSuccess: true, results };
  }

  async downloadLoadSheet(
    loadSheetId: number,
    deliveryAccount: any,
    responseType: 'PDF' | 'JSON' = 'JSON',
  ): Promise<any> {
    // TODO: If TCS exposes load sheet / runsheet endpoint, implement here.
    return {
      isSuccess: false,
      error: 'downloadLoadSheet not implemented for TCS',
      raw: null,
    };
  }

  async getAllCities(deliveryAccount: any): Promise<any> {
    // TODO: If TCS provides a cities endpoint, call it here.
    return {
      isSuccess: false,
      error: 'getAllCities not implemented for TCS',
      raw: null,
    };
  }
}
