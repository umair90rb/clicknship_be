// // src/modules/logistics/integrations/Tranzo/index.ts
// import { Injectable, Logger } from '@nestjs/common';
// import { HttpService } from '@nestjs/axios';
// import { firstValueFrom } from 'rxjs';
// import { AxiosResponse } from 'axios';
// import { ICourierService } from '../types/courier.interface';

// type Normalized = {
//   isSuccess: boolean;
//   cn?: string | null;
//   slip?: string | null;
//   error?: any | null;
//   response?: any | null;
//   history?: any[];
//   status?: any | null;
//   date?: any | null;
//   remarks?: any | null;
//   data?: any;
//   raw?: any;
// };

// /**
//  * TranzoCourier - NestJS integration
//  *
//  * - Implements all Tranzo endpoints (create-order, track-order, cancel-order, get-operational-cities, get-locations,
//  *   get-stores, get-shipment-types, get-order-logs, create-merchant-advice, get-order-status, etc.)
//  * - Uses HttpService from @nestjs/axios and Nest Logger
//  * - No DB lookups (you will add CityNameMaping/other lookups where needed)
//  * - Normalized responses to match other courier adapters
//  */
// @Injectable()
// export default class TranzoCourier implements ICourierService {
//   private readonly logger = new Logger(TranzoCourier.name);
//   private readonly baseUrl = 'https://api-integration.tranzo.pk/api/custom/v1';
//   private readonly metadata = {
//     name: 'TranzoCourier',
//     allowBulkBooking: false,
//   };

//   get getMetadata() {
//     return this.metadata;
//   }

//   constructor(private readonly http: HttpService) {}

//   // ---------------------------- Helpers ----------------------------

//   private buildUrl(path: string) {
//     // ensure leading slash consistency
//     if (!path) return this.baseUrl;
//     if (path.startsWith('/')) path = path.slice(1);
//     return `${this.baseUrl}/${path}`;
//   }

//   private async get<T = any>(
//     path: string,
//     params?: any,
//     headers?: any,
//   ): Promise<AxiosResponse<T>> {
//     const url = this.buildUrl(path);
//     try {
//       this.logger.debug(`GET ${url} params=${JSON.stringify(params)}`);
//       const resp = await firstValueFrom(
//         this.http.get<T>(url, { params, headers }),
//       );
//       return resp;
//     } catch (err) {
//       this.logger.error(
//         `GET ${url} failed`,
//         err?.response?.data ?? err?.message ?? err,
//       );
//       throw err;
//     }
//   }

//   private async post<T = any>(
//     path: string,
//     body?: any,
//     headers?: any,
//     config?: any,
//   ): Promise<AxiosResponse<T>> {
//     const url = this.buildUrl(path);
//     try {
//       this.logger.debug(`POST ${url} body=${JSON.stringify(body)}`);
//       const resp = await firstValueFrom(
//         this.http.post<T>(url, body, { headers, ...config }),
//       );
//       return resp;
//     } catch (err) {
//       this.logger.error(
//         `POST ${url} failed`,
//         err?.response?.data ?? err?.message ?? err,
//       );
//       throw err;
//     }
//   }

//   private async put<T = any>(
//     path: string,
//     body?: any,
//     headers?: any,
//     config?: any,
//   ): Promise<AxiosResponse<T>> {
//     const url = this.buildUrl(path);
//     try {
//       this.logger.debug(`PUT ${url} body=${JSON.stringify(body)}`);
//       const resp = await firstValueFrom(
//         this.http.put<T>(url, body, { headers, ...config }),
//       );
//       return resp;
//     } catch (err) {
//       this.logger.error(
//         `PUT ${url} failed`,
//         err?.response?.data ?? err?.message ?? err,
//       );
//       throw err;
//     }
//   }

//   private normalizeRawSuccessFlag(
//     apiResp: any,
//     successKey = 'status',
//     successWhen = 201,
//   ): { isSuccess: boolean; raw: any } {
//     if (!apiResp) return { isSuccess: false, raw: apiResp };
//     // Common Tranzo patterns:
//     // - HTTP status 201 for create-order success (we'll sometimes rely on HTTP response.status)
//     // - Response may contain `status_code`, `status`, `message`, `detail`, or `tracking_number`
//     return {
//       isSuccess: Boolean(
//         apiResp?.status === successWhen ||
//           apiResp?.status_code === successWhen ||
//           apiResp?.success === true,
//       ),
//       raw: apiResp,
//     };
//   }

//   private toError(err: any) {
//     return err?.response?.data ?? err?.response ?? err?.message ?? String(err);
//   }

//   // ---------------------------- Core ICourierService Methods ----------------------------

//   /**
//    * Create order (book parcel) - POST /create-order/
//    * Uses deliveryAccount.key as api-token header (per legacy JS)
//    */
//   async bookParcel(order: any, deliveryAccount: any): Promise<any> {
//     let response: AxiosResponse | undefined;
//     let body: any;
//     try {
//       // NOTE: skip DB lookup (CityNameMaping). You should map destinationCity before calling this.
//       body = {
//         reference_number: `${order.order_number ?? ''}`,
//         order_details: Array.isArray(order.items)
//           ? order.items.map((it) => `${it.name}/${it.quantity}`).join('-')
//           : (order.order_details ??
//             order.items?.map((it) => `${it.name}/${it.quantity}`).join('-') ??
//             ''),
//         customer_name:
//           `${order.customer?.first_name ?? ''} ${order.customer?.last_name ?? ''}`.trim(),
//         customer_phone: order.customer?.phone
//           ? `0${String(order.customer.phone).replace(/^0/, '')}`
//           : '',
//         ...(order.customer?.email
//           ? { customer_email: order.customer.email }
//           : {}),
//         delivery_address:
//           `${order.address?.address1 ?? ''} ${order.address?.city ?? ''}`.trim(),
//         special_instructions:
//           order.special_instructions ?? order.address2 ?? 'rush delivery',
//         destination_city:
//           order.destination_city ?? order.destination_city_code ?? null, // you will map this
//         pickup_address_code:
//           deliveryAccount?.dispatch_address ?? deliveryAccount?.pickup_address,
//         return_address_code: deliveryAccount?.return_address,
//         ds_shipment_type: deliveryAccount?.client_id
//           ? parseInt(String(deliveryAccount.client_id))
//           : undefined,
//         store_id: deliveryAccount?.cost_center
//           ? parseInt(String(deliveryAccount.cost_center))
//           : undefined,
//         cod_amount: order.total_price ?? 0,
//         total_items: order.items?.length ?? 1,
//         booking_weight: order.weightKg ?? order.weight ?? 0.25,
//       };

//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       response = await this.post('/create-order/', body, { ...headers });
//       const data = response.data ?? {};

//       // legacy JS treated HTTP status 201 as success (response.status === 201)
//       const isSuccess =
//         response.status === 201 ||
//         data?.status === 201 ||
//         data?.status_code === 201 ||
//         data?.success === true;
//       const tracking_number =
//         data?.tracking_number ??
//         data?.tracking_no ??
//         data?.data?.tracking_number ??
//         null;
//       const detail = data?.detail ?? data?.errors ?? null;

//       return {
//         cn: tracking_number ?? null,
//         slip: JSON.stringify(data),
//         isSuccess: Boolean(isSuccess),
//         error: isSuccess ? null : (detail ?? data?.message ?? null),
//         response: isSuccess
//           ? 'Package booked'
//           : (data?.message ?? 'Error: Something goes wrong!'),
//         raw: data,
//       };
//     } catch (err) {
//       this.logger.error('bookParcel error', { body, err: this.toError(err) });
//       const data = (err as any)?.response?.data ?? null;
//       const detail = data?.detail ?? data?.errors ?? null;
//       return {
//         cn: null,
//         slip: null,
//         isSuccess: false,
//         error: detail ?? this.toError(err),
//         response: 'Error: Something goes wrong!',
//         raw: data ?? err,
//       };
//     }
//   }

//   /**
//    * Track order(s) - GET /shopify-detail-tracking-api?tracking_numbers=...
//    * Per your request: support multiple tracking numbers and return mapping.
//    */
//   async checkParcelStatus(
//     trackingNumber: string | string[],
//     deliveryAccount?: any,
//   ): Promise<any> {
//     let response: AxiosResponse | undefined;
//     try {
//       const tns = Array.isArray(trackingNumber)
//         ? trackingNumber.join(',')
//         : String(trackingNumber);
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       // endpoint used in legacy JS: /shopify-detail-tracking-api?tracking_numbers=...
//       response = await this.get(
//         `/shopify-detail-tracking-api`,
//         { tracking_numbers: tns },
//         headers,
//       );
//       const data = response.data ?? {};

//       // The API returns an object where keys are tracking_numbers with arrays as values.
//       // e.g. { "T123": [{...}, ...], "T124": [{...}] }
//       if (typeof data === 'object' && !Array.isArray(data)) {
//         const mapping: Record<string, any[]> = {};
//         for (const [key, value] of Object.entries(data)) {
//           mapping[key] = Array.isArray(value) ? value : [value];
//         }
//         // If user passed single tracking number, also return flattened top-level fields for compat
//         if (!Array.isArray(trackingNumber)) {
//           const firstHistory = mapping[tns] ?? [];
//           const latest = firstHistory?.[0] ?? null;
//           return {
//             isSuccess: true,
//             error: null,
//             history: firstHistory,
//             status: latest?.order_status ?? latest?.status ?? null,
//             date: latest?.status_date_time ?? latest?.status_date ?? null,
//             remarks: latest?.order_status_message ?? null,
//             data: { mapping },
//             response: 'Tracking successful',
//             raw: data,
//           };
//         }
//         // multiple tracking numbers requested -> return mapping
//         return {
//           isSuccess: true,
//           error: null,
//           history: [], // not a single flattened history
//           status: null,
//           date: null,
//           remarks: null,
//           data: { mapping },
//           response: 'Tracking successful (multiple)',
//           raw: data,
//         };
//       }

//       // fallback - if response is an array or other structure
//       const history = Array.isArray(data) ? data : [];
//       const latest = history?.[0] ?? null;
//       return {
//         isSuccess: true,
//         history,
//         status: latest?.order_status ?? null,
//         date: latest?.status_date_time ?? null,
//         remarks: latest?.order_status_message ?? null,
//         data,
//         response: 'Tracking successful',
//         raw: data,
//       };
//     } catch (err) {
//       this.logger.error('checkParcelStatus error', {
//         err: this.toError(err),
//         trackingNumber,
//       });
//       const data = (err as any)?.response?.data ?? null;
//       // Try to surface error per-tracking-number if available
//       if (data && typeof data === 'object') {
//         return {
//           isSuccess: false,
//           error: data,
//           history: [],
//           status: null,
//           date: null,
//           remarks: null,
//           data,
//           response: 'Error in getting booking status!',
//           raw: data,
//         };
//       }
//       return {
//         isSuccess: false,
//         error: this.toError(err),
//         history: [],
//         status: null,
//         date: null,
//         remarks: null,
//         data: {},
//         response: 'Error in getting booking status!',
//         raw: data ?? err,
//       };
//     }
//   }

//   /**
//    * Cancel booking - PUT /cancel-order/
//    */
//   async cancelBooking(
//     trackingNumber: string | string[],
//     deliveryAccount: any,
//   ): Promise<any> {
//     let response: AxiosResponse | undefined;
//     let body: any;
//     try {
//       body = {
//         tracking_numbers: Array.isArray(trackingNumber)
//           ? trackingNumber
//           : [trackingNumber],
//       };
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       response = await this.put(`/cancel-order/`, body, { ...headers });
//       const data = response.data ?? {};
//       // response.data often an array per legacy JS: response.data?.[0] ...
//       const first = Array.isArray(data) ? data[0] : data;
//       const status_code =
//         first?.status_code ?? first?.status ?? response.status;
//       const non_field_errors = first?.non_field_errors ?? first?.detail ?? null;
//       const message = first?.message ?? first?.detail ?? data?.message ?? null;
//       return {
//         isSuccess: status_code === 200 || status_code === '200',
//         error:
//           status_code === 200 ? null : (non_field_errors ?? message ?? null),
//         response:
//           status_code === 200
//             ? (message ?? 'Canceled')
//             : (message ?? 'Error something goes wrong'),
//         raw: data,
//       };
//     } catch (err) {
//       this.logger.error('cancelBooking error', {
//         body,
//         err: this.toError(err),
//       });
//       const data = (err as any)?.response?.data ?? null;
//       return {
//         isSuccess: false,
//         error: data ?? this.toError(err),
//         response: 'Error cancelling booking',
//         raw: data ?? err,
//       };
//     }
//   }

//   /**
//    * Download receipt / invoice (Tranzo may provide public slip endpoints)
//    * Attempt to return URL or binary depending on API. Here return URL pattern + raw when unknown.
//    */
//   async downloadReceipt(
//     trackingNumber: string | string[],
//     deliveryAccount?: any,
//   ): Promise<any> {
//     try {
//       // Tranzo JS didn't implement a specific receipt download; we return a best-effort URL pattern.
//       const tn = Array.isArray(trackingNumber)
//         ? trackingNumber[0]
//         : trackingNumber;
//       const publicUrl = `${this.baseUrl}/order/${encodeURIComponent(String(tn))}/print`; // adjust if doc has a specific route
//       return {
//         isSuccess: true,
//         url: publicUrl as any,
//         response: 'Public slip url (verify)',
//         raw: { url: publicUrl },
//       };
//     } catch (err) {
//       this.logger.error('downloadReceipt error', this.toError(err));
//       return {
//         isSuccess: false,
//         error: this.toError(err),
//         response: 'Error fetching receipt',
//         raw: err,
//       };
//     }
//   }

//   // ---------------------------- Additional Tranzo endpoints ----------------------------

//   /**
//    * Get operational cities - GET /get-operational-cities/
//    */
//   async getOperationalCities(deliveryAccount?: any): Promise<any> {
//     try {
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       const resp = await this.get('/get-operational-cities/', {}, headers);
//       const data = resp.data ?? {};
//       return { isSuccess: true, data: data?.cities ?? data, raw: data };
//     } catch (err) {
//       this.logger.error('getOperationalCities error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   /**
//    * Get locations - GET /get-locations/
//    */
//   async getLocations(deliveryAccount?: any): Promise<any> {
//     try {
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       const resp = await this.get('/get-locations/', {}, headers);
//       const data = resp.data ?? {};
//       return { isSuccess: true, data: data?.locations ?? data, raw: data };
//     } catch (err) {
//       this.logger.error('getLocations error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   /**
//    * Get stores - GET /get-stores/
//    */
//   async getStores(deliveryAccount?: any): Promise<any> {
//     try {
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       const resp = await this.get('/get-stores/', {}, headers);
//       const data = resp.data ?? {};
//       return { isSuccess: true, data: data?.stores ?? data, raw: data };
//     } catch (err) {
//       this.logger.error('getStores error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   /**
//    * Get shipment types - GET /get-shipment-types/
//    */
//   async getShipmentTypes(deliveryAccount?: any): Promise<any> {
//     try {
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       const resp = await this.get('/get-shipment-types/', {}, headers);
//       const data = resp.data ?? {};
//       return { isSuccess: true, data: data?.shipment_types ?? data, raw: data };
//     } catch (err) {
//       this.logger.error('getShipmentTypes error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   /**
//    * Get order logs - PUT /get-order-logs/ (supports filters by tracking/status/date-range)
//    */
//   async getOrderLogs(query: any, deliveryAccount?: any): Promise<any> {
//     try {
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       // legacy doc may expect PUT with filters in body
//       const resp = await this.put('/get-order-logs/', query || {}, {
//         ...headers,
//       });
//       const data = resp.data ?? {};
//       return { isSuccess: true, data: data?.logs ?? data, raw: data };
//     } catch (err) {
//       this.logger.error('getOrderLogs error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   /**
//    * Create merchant advice - PUT /create-merchant-advice/ (or POST depending on doc)
//    * body example: { order_reference_no: '...', advise: '...' }
//    */
//   async createMerchantAdvice(
//     payload: any,
//     deliveryAccount?: any,
//   ): Promise<any> {
//     try {
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       // doc might use POST or PUT - use POST if not sure
//       const resp = await this.post('/create-merchant-advice/', payload, {
//         ...headers,
//       });
//       const data = resp.data ?? {};
//       return {
//         isSuccess: true,
//         response: data?.message ?? data,
//         data,
//         raw: data,
//       };
//     } catch (err) {
//       this.logger.error('createMerchantAdvice error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   /**
//    * Get order status - GET /get-order-status/?tracking_number=...
//    */
//   async getOrderStatus(
//     trackingNumber: string | string[],
//     deliveryAccount?: any,
//   ): Promise<any> {
//     try {
//       const tn = Array.isArray(trackingNumber)
//         ? trackingNumber.join(',')
//         : String(trackingNumber);
//       const headers = deliveryAccount?.key
//         ? { 'api-token': deliveryAccount.key }
//         : {};
//       const resp = await this.get(
//         '/get-order-status/',
//         { tracking_number: tn },
//         { ...headers },
//       );
//       const data = resp.data ?? {};
//       return { isSuccess: true, data: data?.status ?? data, raw: data };
//     } catch (err) {
//       this.logger.error('getOrderStatus error', this.toError(err));
//       const data = (err as any)?.response?.data ?? null;
//       return { isSuccess: false, error: data ?? this.toError(err), raw: data };
//     }
//   }

//   // ---------------------------- Convenience / compatibility methods ----------------------------

//   /**
//    * Batch book - fallback loop (Tranzo has create-order single endpoint)
//    */
//   async batchBookPacket(
//     payload: { bookings: any[] },
//     deliveryAccount: any,
//   ): Promise<any> {
//     try {
//       const results: any[] = [];
//       for (const b of payload.bookings) {
//         // sequential is safer for rate limits; change to parallel if desired
//         // eslint-disable-next-line no-await-in-loop
//         const res = await this.bookParcel(b, deliveryAccount);
//         results.push(res);
//       }
//       return { isSuccess: true, data: results, raw: null };
//     } catch (err) {
//       this.logger.error('batchBookPacket error', this.toError(err));
//       return { isSuccess: false, error: this.toError(err) };
//     }
//   }

//   async getAllCities(deliveryAccount?: any): Promise<any> {
//     // alias of getOperationalCities
//     return this.getOperationalCities(deliveryAccount);
//   }

//   //   async getMetadata() {
//   //     return {
//   //       baseUrl: this.baseUrl,
//   //       implemented: [
//   //         'bookParcel',
//   //         'checkParcelStatus',
//   //         'cancelBooking',
//   //         'downloadReceipt',
//   //         'getOperationalCities',
//   //         'getLocations',
//   //         'getStores',
//   //         'getShipmentTypes',
//   //         'getOrderLogs',
//   //         'createMerchantAdvice',
//   //         'getOrderStatus',
//   //         'batchBookPacket',
//   //       ],
//   //     };
//   //   }
// }
