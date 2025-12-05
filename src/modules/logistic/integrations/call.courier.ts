// src/modules/logistics/integrations/callcourier/index.ts
/**
 * CallCourier integration for Clicknship (NestJS)
 *
 * References:
 *  - CallCourier API documentation (uploaded). See: APIConfiguration.pdf
 *    Citation: :contentReference[oaicite:1]{index=1}
 *
 * Notes:
 *  - Uses @nestjs/axios HttpService
 *  - Uses Nest Logger
 *  - No DB lookups (you'll add City mapping if required)
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { ICourierService } from '../types/courier.interface'; // as requested

type AnyObject = Record<string, any>;

@Injectable()
export class CallCourier implements ICourierService {
  private readonly logger = new Logger(CallCourier.name);
  private readonly baseUrl: string;
  private readonly metadata = {
    name: 'DaewooCourier',
    allowBulkBooking: false
  }

  get getMetadata(){
    return this.metadata;
  }
  constructor(
    private readonly http: HttpService,
    @Inject('CALLCOURIER_BASE_URL') baseUrl?: string,
  ) {
    // default documented base URL
    this.baseUrl = baseUrl ?? 'http://cod.callcourier.com.pk/API/CallCourier/';
  }

  // -------------------- Helpers --------------------

  private async get<T = any>(
    path: string,
    params?: AnyObject,
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.debug(`GET ${url} params=${JSON.stringify(params ?? {})}`);
      const obs = this.http.get<T>(url, { params });
      return await firstValueFrom(obs);
    } catch (err) {
      this.logger.error(`HTTP GET error: ${url}`, err?.response?.data ?? err);
      throw err;
    }
  }

  private async post<T = any>(
    path: string,
    body?: AnyObject,
  ): Promise<AxiosResponse<T>> {
    const url = `${this.baseUrl}${path}`;
    try {
      this.logger.debug(`POST ${url} body=${JSON.stringify(body ?? {})}`);
      const obs = this.http.post<T>(url, body ?? {}, {
        headers: { 'Content-Type': 'application/json' },
      });
      return await firstValueFrom(obs);
    } catch (err) {
      this.logger.error(`HTTP POST error: ${url}`, err?.response?.data ?? err);
      throw err;
    }
  }

  private normalizeStatus(resp: any) {
    // Many CallCourier endpoints use "status": "1" or 1 for success
    if (!resp) return { isSuccess: false, raw: resp, error: 'No response' };
    const s = resp?.status;
    const isSuccess = s === 1 || s === '1' || s === true;
    return { isSuccess, raw: resp, error: resp?.error ?? null };
  }

  // -------------------- Core required methods --------------------

  /**
   * Save booking (SaveBooking)
   * Legacy JS used GET query string for SaveBooking. Doc supports SaveBooking via query.
   *
   * order: expected order object (your app format)
   * deliveryAccount: { key/loginId, ... } - you can adjust keys per your deliveryAccount shape
   */
  async bookParcel(order: any, deliveryAccount: any) {
    // Build query parameters based on API doc and legacy JS
    try {
      const loginId =
        deliveryAccount.key ||
        deliveryAccount.loginId ||
        deliveryAccount.loginID;
      const consigneeName =
        `${order.customer?.first_name || ''} ${order.customer?.last_name || ''}`.trim();
      const consigneeRefNo = order.order_number ?? '';
      const consigneeCellNo = order.customer?.phone
        ? `0${order.customer.phone}`
        : '';
      const address = order.address?.address1 ?? '';
      // origin and service type should be provided by deliveryAccount or order
      const origin =
        deliveryAccount.origin || deliveryAccount.branch || 'Origin';
      const destCityId =
        order.destination_city ||
        order.address?.city_id ||
        (deliveryAccount.destCityId ?? '');
      const serviceTypeId =
        deliveryAccount.service_type_id ||
        deliveryAccount.serviceTypeId ||
        deliveryAccount.serviceType ||
        '7';
      const pcs = order.items?.length
        ? String(order.items.length).padStart(2, '0')
        : '01';
      const weight = order.weight ? String(order.weight) : '01';
      const description =
        (order.items || [])
          .map((it: any) => `${it.name}/${it.quantity}`)
          .join('-') ||
        order.description ||
        'NA';
      const selOrigin = order.selOrigin || 'Domestic';
      const codAmount = String(order.total_price ?? 0);
      const specialHandling = order.specialHandling ?? false;
      const myBoxId = deliveryAccount.myBoxId ?? 1;
      const holiday = order.holiday ?? false;
      const remarks = order.remarks ?? 'Booked via Clicknship';
      const shipperName =
        deliveryAccount.shipper_name ||
        deliveryAccount.shipperName ||
        'Clicknship';
      const shipperCell =
        deliveryAccount.shipper_cell_no ||
        deliveryAccount.shipperCellNo ||
        deliveryAccount.shipperCell ||
        '';
      const shipperArea =
        deliveryAccount.shipper_area || deliveryAccount.shipperArea || '';
      const shipperCity =
        deliveryAccount.shipper_city || deliveryAccount.shipperCity || '';
      const shipperAddress =
        deliveryAccount.shipper_address || deliveryAccount.shipperAddress || '';
      const shipperLandLineNo =
        deliveryAccount.shipper_landline ||
        deliveryAccount.shipperLandLine ||
        '';
      const shipperEmail =
        deliveryAccount.shipper_email || deliveryAccount.shipperEmail || '';

      // Build query string parameters according to documentation
      const params = {
        loginId,
        ConsigneeName: consigneeName,
        ConsigneeRefNo: consigneeRefNo,
        ConsigneeCellNo: consigneeCellNo,
        Address: address,
        Origin: origin,
        DestCityId: destCityId,
        ServiceTypeId: serviceTypeId,
        Pcs: pcs,
        Weight: weight,
        Description: description,
        SelOrigin: selOrigin,
        CodAmount: codAmount,
        SpecialHandling: specialHandling,
        MyBoxId: myBoxId,
        Holiday: holiday,
        remarks,
        ShipperName: shipperName,
        ShipperCellNo: shipperCell,
        ShipperArea: shipperArea,
        ShipperCity: shipperCity,
        ShipperAddress: shipperAddress,
        ShipperLandLineNo: shipperLandLineNo,
        ShipperEmail: shipperEmail,
      };

      // SaveBooking appears to be called via GET with query params in the doc and sample URL
      const resp = await this.get<any>('SaveBooking', params);
      this.logger.log('SaveBooking response', JSON.stringify(resp?.data ?? {}));

      // The API returns CN as CNNO in production JS file. It may return different keys so we inspect
      const data = resp?.data ?? {};
      const CNNO = data?.CNNO ?? data?.cn ?? data?.track_number ?? null;
      const ResponseText =
        data?.Response ?? data?.response ?? data?.message ?? null;

      return {
        cn: CNNO,
        slip: JSON.stringify(data),
        isSuccess: CNNO !== null && CNNO !== undefined && CNNO !== '',
        error: CNNO ? null : (ResponseText ?? data?.error ?? 'Booking failed'),
        response:
          ResponseText ?? (CNNO ? 'Booked successfully' : 'Booking failed'),
        raw: data,
      };
    } catch (err) {
      this.logger.error('bookParcel error', err?.response?.data ?? err);
      const respData = err?.response?.data ?? null;
      return {
        cn: null,
        slip: null,
        isSuccess: false,
        error: respData?.error ?? err?.message,
        response:
          respData?.Response ?? respData?.message ?? 'Error in SaveBooking',
        raw: respData,
      };
    }
  }

  /**
   * Tracking history (GetTackingHistory)
   * Accepts a single CN or comma separated list.
   */
  async checkParcelStatus(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    try {
      const cn = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : trackingNumber;
      // endpoint: GetTackingHistory?cn={cn}
      const resp = await this.get<any>('GetTackingHistory', { cn });
      this.logger.log(
        'GetTackingHistory response',
        JSON.stringify(resp?.data ?? {}),
      );
      const data = resp?.data ?? {};
      // Legacy JS used response.data.revers() — likely means reversed tracking array
      const history = Array.isArray(data)
        ? data.reverse()
        : (data?.data ?? data?.Tracking ?? []);
      const latest =
        Array.isArray(history) && history.length ? history[0] : null;
      return {
        isSuccess: true,
        error: null,
        history,
        status: latest?.ProcessDescForPortal ?? latest?.ProcessDesc ?? null,
        date: latest?.TransactionDate ?? null,
        remarks: latest?.Remarks ?? null,
        data,
        response: 'Current Booking status!',
        raw: data,
      };
    } catch (err) {
      this.logger.error('checkParcelStatus error', err?.response?.data ?? err);
      const respData = err?.response?.data ?? null;
      return {
        isSuccess: false,
        error: respData?.error ?? err?.message,
        history: respData ?? [],
        status: null,
        date: null,
        remarks: null,
        data: respData,
        response: 'Error in fetching current booking status!',
      };
    }
  }

  /**
   * Cancel booking - CallCourier may or may not support cancellation via API.
   * Doc doesn't explicitly show CancelBooking endpoint; implement a safe stub or try endpoint name 'CancelBooking'
   */
  async cancelBooking(trackingNumber: string | string[], deliveryAccount: any) {
    try {
      // Try calling CancelBooking if available
      const cnNumbers = Array.isArray(trackingNumber)
        ? trackingNumber.join(',')
        : trackingNumber;
      const resp = await this.get<any>('CancelBooking', {
        cn: cnNumbers,
        loginId: deliveryAccount.key,
      });
      const data = resp?.data ?? {};
      const normalized = this.normalizeStatus(data);
      return {
        isSuccess: normalized.isSuccess,
        error: normalized.error,
        response: normalized.isSuccess
          ? 'Booking cancelled'
          : 'Cancel booking failed or not supported',
        raw: data,
      };
    } catch (err) {
      // If CancelBooking is not supported, respond with a clear message
      this.logger.warn(
        'cancelBooking not available or failed',
        err?.response?.data ?? err,
      );
      return {
        isSuccess: false,
        error: err?.response?.data ?? err?.message,
        response: 'Cancel booking not available for CallCourier or failed',
      };
    }
  }

  /**
   * Download receipt / CN slip.
   * The PDF slip URL pattern (Generate CN Slip Report) is:
   *   http://cod.callcourier.com.pk/Booking/AfterSavePublic/{CN Number}
   */
  async downloadReceipt(
    trackingNumber: string | string[],
    deliveryAccount: any,
  ) {
    try {
      const cn = Array.isArray(trackingNumber)
        ? trackingNumber[0]
        : trackingNumber;
      const url = `http://cod.callcourier.com.pk/Booking/AfterSavePublic/${encodeURIComponent(cn)}`;
      // We return the URL to the PDF slip. If you want binary fetch, we can also fetch with responseType arraybuffer.
      return {
        isSuccess: true,
        data: { url },
        error: null,
        response: 'Download URL generated',
        raw: null,
      };
    } catch (err) {
      this.logger.error('downloadReceipt error', err);
      return {
        isSuccess: false,
        data: null,
        error: err?.message ?? 'Failed to create download url',
        response: 'Error generating CN slip URL',
      };
    }
  }

  // -------------------- Full API endpoints from documentation --------------------

  async getCityListByService(serviceID: string | number) {
    // GET GetCityListByService?serviceID=ServiceID
    try {
      const resp = await this.get<any>('GetCityListByService', {
        serviceID: String(serviceID),
      });
      this.logger.debug('getCityListByService', resp?.data);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error(
        'getCityListByService error',
        err?.response?.data ?? err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getAreasByCity(cityId: string | number) {
    // GET GetAreasByCity?CityID=CityID
    try {
      const resp = await this.get<any>('GetAreasByCity', {
        CityID: String(cityId),
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getAreasByCity error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getServiceType(accountIdOrShipperId: string | number) {
    // GET GetServiceType/{id}
    try {
      const path = `GetServiceType/${encodeURIComponent(String(accountIdOrShipperId))}`;
      const resp = await this.get<any>(path);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getServiceType error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getOriginListByShipper(loginId: string) {
    // GET GetOriginListByShipper?LoginId=LoginID
    try {
      const resp = await this.get<any>('GetOriginListByShipper', {
        LoginId: loginId,
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error(
        'getOriginListByShipper error',
        err?.response?.data ?? err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getRates(params: {
    packet_weight: number;
    shipment_type: number | string;
    origin_city: string | number;
    destination_city: string | number;
    cod_amount?: number;
    deliveryAccount?: any;
  }) {
    // According to doc: getTariffDetails / get rates via query string
    try {
      const qsParams: AnyObject = {
        api_key:
          params.deliveryAccount?.key ?? params.deliveryAccount?.apiKey ?? '',
        api_password:
          params.deliveryAccount?.password ??
          params.deliveryAccount?.apiPassword ??
          '',
        packet_weight: String(params.packet_weight),
        shipment_type: String(params.shipment_type),
        origin_city: String(params.origin_city),
        destination_city: String(params.destination_city),
        cod_amount: String(params.cod_amount ?? 0),
      };
      const path = `getTariffDetails/format/json/`;
      // call using GET with query params on baseUrl (some doc show full absolute url)
      const resp = await this.get<any>(path, qsParams);
      this.logger.debug('getRates', resp?.data);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getRates error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getShippingCharges(cnNumbers: string[] | string, deliveryAccount: any) {
    try {
      const cn_numbers = Array.isArray(cnNumbers)
        ? cnNumbers.join(',')
        : cnNumbers;
      const qs = {
        api_key: deliveryAccount.key,
        api_password: deliveryAccount.password,
        cn_numbers,
      };
      const resp = await this.get<any>('getShippingCharges/format/json/', qs);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getShippingCharges error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getBookingDetail(
    trackNumber: string | string[],
    deliveryAccount?: any,
  ) {
    try {
      const track_number = Array.isArray(trackNumber)
        ? trackNumber.join(',')
        : trackNumber;
      const resp = await this.get<any>('GetBookingDetail', {
        cn: track_number,
        loginId: deliveryAccount?.key,
      });
      this.logger.debug('getBookingDetail', resp?.data);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getBookingDetail error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getRunsheet(params: AnyObject) {
    // Example: GetRunsheet?RunSheetId=...
    try {
      const resp = await this.get<any>('GetRunsheet', params);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getRunsheet error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getRiderDetail(riderId: string | number) {
    try {
      const resp = await this.get<any>('GetRiderDetail', {
        RiderId: String(riderId),
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getRiderDetail error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getCODTransferDetail(params: AnyObject) {
    try {
      const resp = await this.get<any>('GetCODTransferDetail', params);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error(
        'getCODTransferDetail error',
        err?.response?.data ?? err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getInvoices(params: AnyObject) {
    try {
      const resp = await this.get<any>('GetInvoices', params);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getInvoices error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getCustomerInfo(customerIdOrPhone: string | AnyObject) {
    try {
      const resp = await this.get<any>('GetCustomerInfo', {
        q: customerIdOrPhone,
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getCustomerInfo error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getClientInfo(clientId: string | number) {
    try {
      const resp = await this.get<any>('GetClientInfo', {
        ClientId: String(clientId),
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getClientInfo error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getOrderDetail(orderId: string | number) {
    try {
      const resp = await this.get<any>('GetOrderDetail', {
        id: String(orderId),
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getOrderDetail error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getDeliveryStatus(params: AnyObject) {
    try {
      const resp = await this.get<any>('GetDeliveryStatus', params);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getDeliveryStatus error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  /**
   * For endpoints that require POST body (e.g., some reporting endpoints),
   * call this.post(...) accordingly. Example below:
   */
  async shipperAdviceList(query: AnyObject, deliveryAccount: any) {
    try {
      const body = {
        loginId: deliveryAccount.key,
        ...query,
      };
      const resp = await this.post<any>('shipperAdviceList', body);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('shipperAdviceList error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async updateShipperAdvice(payload: AnyObject[], deliveryAccount: any) {
    try {
      const body = { loginId: deliveryAccount.key, data: payload };
      const resp = await this.post<any>('updateShipperAdvice', body);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error(
        'updateShipperAdvice error',
        err?.response?.data ?? err,
      );
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async activityLog(query: AnyObject, deliveryAccount: any) {
    try {
      const body = { loginId: deliveryAccount.key, ...query };
      const resp = await this.post<any>('activityLog', body);
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('activityLog error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }

  async getAllCities(deliveryAccount: any) {
    try {
      const resp = await this.get<any>('GetAllCities', {
        loginId: deliveryAccount.key,
      });
      return this.normalizeStatus(resp?.data);
    } catch (err) {
      this.logger.error('getAllCities error', err?.response?.data ?? err);
      return { isSuccess: false, error: err?.response?.data ?? err?.message };
    }
  }
}

export default CallCourier;
