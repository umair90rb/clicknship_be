import { Injectable, Logger } from '@nestjs/common';
import * as CryptoJS from 'crypto-js';
import {
  IPaymentGateway,
  InitiatePaymentDto,
  PaymentInitiationResult,
  PaymentVerificationResult,
  CallbackResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class AlfaPayGateway implements IPaymentGateway {
  name = 'alfapay';
  private readonly logger = new Logger(AlfaPayGateway.name);

  private get config() {
    return {
      url: process.env.ALFAPAY_URL || 'https://sandbox.bankalfalah.com/HS/api/HSAPI/HSAPI',
      channelId: process.env.ALFAPAY_CHANNEL_ID,
      merchantId: process.env.ALFAPAY_MERCHANT_ID,
      storeId: process.env.ALFAPAY_STORE_ID,
      merchantUsername: process.env.ALFAPAY_MERCHANT_USERNAME,
      merchantPassword: process.env.ALFAPAY_MERCHANT_PASSWORD,
      merchantHash: process.env.ALFAPAY_MERCHANT_HASH,
      key1: process.env.ALFAPAY_KEY_1,
      key2: process.env.ALFAPAY_KEY_2,
    };
  }

  private encrypt(data: string, key: string): string {
    const keyBytes = CryptoJS.enc.Utf8.parse(key);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(data, keyBytes, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7,
    });

    return encrypted.toString();
  }

  private buildRequestHash(params: Record<string, string>): string {
    const paramString = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join('&');

    return this.encrypt(paramString, this.config.key1);
  }

  async initiatePayment(data: InitiatePaymentDto): Promise<PaymentInitiationResult> {
    try {
      const transactionRef = `AP_${Date.now()}_${data.orderId}`;

      // Build request parameters
      const params = {
        ChannelId: this.config.channelId,
        MerchantId: this.config.merchantId,
        StoreId: this.config.storeId,
        MerchantHash: this.config.merchantHash,
        MerchantUsername: this.config.merchantUsername,
        MerchantPassword: this.config.merchantPassword,
        TransactionTypeId: '1', // Alfa Wallet
        TransactionReferenceNumber: transactionRef,
        TransactionAmount: data.amount.toString(),
        Currency: 'PKR',
        ReturnURL: data.returnUrl,
      };

      // Get auth token from AlfaPay
      const response = await fetch(this.config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...params,
          RequestType: 'GetToken',
        }),
      });

      const result = await response.json();

      if (result.success === 'true') {
        // Build encrypted request hash for redirect
        const requestHash = this.buildRequestHash(params);

        return {
          success: true,
          redirectUrl: `${this.config.url}?AuthToken=${result.AuthToken}&RequestHash=${encodeURIComponent(requestHash)}`,
          gatewayRef: transactionRef,
        };
      }

      return {
        success: false,
        error: result.message || 'Failed to initiate AlfaPay payment',
      };
    } catch (error) {
      this.logger.error('AlfaPay initiation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyPayment(referenceId: string): Promise<PaymentVerificationResult> {
    try {
      const ipnUrl = `${this.config.url.replace('/HSAPI/HSAPI', '/IPN/OrderStatus')}/${this.config.merchantId}/${this.config.storeId}/${referenceId}`;

      const response = await fetch(ipnUrl);
      const status = await response.text();

      return {
        success: true,
        status: status === 'PAID' ? 'paid' : 'failed',
        transactionId: referenceId,
      };
    } catch (error) {
      this.logger.error('AlfaPay verification error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async handleCallback(data: any): Promise<CallbackResult> {
    try {
      // AlfaPay sends IPN with url parameter
      if (data.url) {
        const response = await fetch(data.url);
        const status = await response.text();

        // Extract order ID from URL
        const urlParts = data.url.split('/');
        const orderId = urlParts[urlParts.length - 1];

        return {
          success: true,
          orderId,
          status: status === 'PAID' ? 'paid' : 'failed',
        };
      }

      return {
        success: false,
        orderId: '',
        status: 'failed',
      };
    } catch (error) {
      this.logger.error('AlfaPay callback error:', error);
      return {
        success: false,
        orderId: '',
        status: 'failed',
      };
    }
  }
}
