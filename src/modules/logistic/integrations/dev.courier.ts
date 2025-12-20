// src/modules/logistics/integrations/Daewoo/index.ts
import { Injectable, Logger } from '@nestjs/common';
import {
  BatchBookParcelResponse,
  BookParcelResponse,
  ICourierService,
  ParcelStatusResponse,
} from '../types/courier.interface'; // per your project layout

@Injectable()
export default class DevCourier implements ICourierService {
  private readonly logger = new Logger(DevCourier.name);
  private readonly baseUrl = 'localhost';
  private readonly metadata = {
    name: 'DevCourier',
    allowBulkBooking: false,
    allowBulkTracking: true,
  };

  get getMetadata() {
    return this.metadata;
  }

  private wait(ms = 1000) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async bookParcel(
    order: any,
    courierAccount: any,
  ): Promise<BookParcelResponse> {
    try {
      await this.wait();
      return {
        courierAccount,
        order,
        success: true,
        cn: Math.random().toString().split('.')[1],
        message: null,
        data: {},
      };
    } catch (err) {
      this.logger.error(
        'bookParcel error',
        err?.response?.data ?? err?.message ?? err,
      );
      return {
        success: false,
        message: err,
        courierAccount,
        order,
        cn: null,
        data: {},
      };
    }
  }

  async batchBookParcels(
    orders: any[],
    courierAccount: any,
  ): Promise<BatchBookParcelResponse> {
    try {
      await this.wait(orders.length);
      return {
        success: true,
        courierAccount,
        message: 'order batch booking successfully',
        bookings: orders.map((order) => ({
          order,
          cn: Math.random().toString().split('.')[1],
        })),
      };
    } catch (err) {
      this.logger.error(
        'bookParcel error',
        err?.response?.data ?? err?.message ?? err,
      );
      return {
        success: false,
        courierAccount,
        message: 'order batch booking successfully',
        bookings: [],
      };
    }
  }

  async parcelStatus(
    shipment: any,
    courierAccount?: any,
  ): Promise<ParcelStatusResponse> {
    try {
      await this.wait(1000);
      return {
        success: true,
        message: 'Order tracked successfully',
        courierAccount,
        shipment,
        cn: shipment?.cn,
        tracking: [
          {
            status: 'Delivered',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Out for Delivery',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Reached',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'In Transit',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Warehouse',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Dispatched',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Booked',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
        ],
      };
    } catch (err) {
      this.logger.error(
        'bookParcel error',
        err?.response?.data ?? err?.message ?? err,
      );
      return {
        success: false,
        courierAccount,
        shipment,
        cn: shipment?.cn,
        tracking: [],
        message: err.message || 'Order tracking failed',
      };
    }
  }

  async batchParcelStatus(
    shipments: any[],
    courierAccount?: any,
  ): Promise<any> {
    try {
      await this.wait(shipments.length * 1000);
      return shipments.map((shipment) => ({
        success: true,
        courierAccount,
        shipment,
        cn: shipment?.cn,
        tracking: [
          {
            status: 'Delivered',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Out for Delivery',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Reached',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'In Transit',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Warehouse',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Dispatched',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
          {
            status: 'Booked',
            date: new Date(),
            reason: 'None',
            receiver: 'string',
          },
        ],
        message: 'Order tracked successfully',
      }));
    } catch (err) {
      this.logger.error(
        'bookParcel error',
        err?.response?.data ?? err?.message ?? err,
      );
      return shipments.map((shipment) => ({
        success: false,
        courierAccount,
        shipment,
        cn: shipment?.cn,
        tracking: [],
        message: err.message || 'Order tracking failed',
      }));
    }
  }

  /**
   * Cancel booking - quickCancel
   */
  async cancelBooking(trackingNumber: string, courierAccount: any) {
    try {
      await this.wait();
      return {
        cn: trackingNumber,
        courierAccount,
        success: true,
        message: 'Booking canceled!',
        data: {},
      };
    } catch (err) {
      this.logger.error(
        'checkParcelStatus error',
        err?.response?.data ?? err?.message ?? err,
      );
      return {
        cn: trackingNumber,
        courierAccount,
        success: false,
        message: err,
        data: {},
      };
    }
  }

  /**
   * Get all locations (terminals) allowed for booking: /api/cargo/getLocations
   */
  async getLocations(courierAccount: any) {}

  /**
   * Calculate tariff / service charges: quickCalculateRate
   * Expects payload { destination_terminal_id, qty, weight, ... }
   */
  async quickCalculateRate(payload: any, courierAccount: any) {}

  /**
   * Get booking detail (if available in API). The PDF doesn't give a single canonical endpoint name for all details;
   * we'll attempt to call a plausible endpoint path. If your real API has a different route, change accordingly.
   */
  async getBookingDetail(trackingNumber: string, courierAccount: any) {
    try {
      // The doc uses quickTrack for tracking details. We'll reuse quickTrack result as booking detail.
      return await this.parcelStatus(trackingNumber, courierAccount);
    } catch (err) {
      this.logger.error(
        'getBookingDetail error',
        err?.response?.data ?? err?.message ?? err,
      );
      return { isSuccess: false, error: err?.message ?? err };
    }
  }

  async downloadReceipt(trackingNumber: string[], courierAccount: any) {
    try {
      // There is no explicit PDF endpoint in the v1.3 doc; return a best-effort public URL (adjust if wrong).
      const publicSlipUrl = `${this.baseUrl}/Booking/AfterSavePublic/${encodeURIComponent(String(trackingNumber))}`;
      return {
        success: true,
        url: publicSlipUrl,
        response: 'Public slip url (verify with Daewoo if available)',
      };
    } catch (err) {
      this.logger.error('downloadReceipt error', err?.message ?? err);
      return { isSuccess: false, error: err?.message ?? err };
    }
  }
  async downloadLoadSheet(
    loadSheetId: number,
    courierAccount: any,
    responseType: 'JSON' | 'PDF' = 'JSON',
  ) {
    return {
      success: true,
      error:
        'downloadLoadSheet not supported by Daewoo API (use runsheet endpoints if available)',
    };
  }
}
