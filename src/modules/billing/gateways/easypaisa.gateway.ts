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
export class EasypaisaGateway implements IPaymentGateway {
  name = 'easypaisa';
  private readonly logger = new Logger(EasypaisaGateway.name);

  private get config() {
    return {
      url: process.env.EASYPAISA_URL || 'https://easypay.easypaisa.com.pk/easypay/Index.jsf',
      storeId: process.env.EASYPAISA_STORE_ID,
      username: process.env.EASYPAISA_USERNAME,
      password: process.env.EASYPAISA_PASSWORD,
      hashKey: process.env.EASYPAISA_HASHKEY,
    };
  }

  private generateHash(data: string): string {
    return CryptoJS.HmacSHA256(data, this.config.hashKey).toString(CryptoJS.enc.Base64);
  }

  private getFormattedDateTime(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}${month}${day} ${hours}${minutes}${seconds}`;
  }

  async initiatePayment(data: InitiatePaymentDto): Promise<PaymentInitiationResult> {
    try {
      const orderRefNum = `EP_${Date.now()}_${data.orderId}`;
      const timeStamp = this.getFormattedDateTime();
      const expiryDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');

      // Build hash request
      const hashString = [
        data.amount.toFixed(1),
        orderRefNum,
        data.returnUrl,
        this.config.storeId,
        timeStamp,
        'MA', // Transaction type - Mobile Account
      ].join('&');

      const encryptedHash = this.generateHash(hashString);

      const params: Record<string, string> = {
        storeId: this.config.storeId,
        amount: data.amount.toFixed(1),
        postBackURL: data.returnUrl,
        orderRefNum,
        expiryDate,
        autoRedirect: '1',
        paymentMethod: 'MA_PAYMENT_METHOD',
        emailAddr: data.customerEmail || '',
        mobileNum: data.customerPhone || '',
        encryptedHashRequest: encryptedHash,
      };

      // Build HTML form for redirect
      const formFields = Object.entries(params)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
        .join('\n');

      const htmlForm = `
        <html>
        <body onload="document.forms['easypaisa'].submit()">
          <form name="easypaisa" method="POST" action="${this.config.url}">
            ${formFields}
          </form>
        </body>
        </html>
      `;

      return {
        success: true,
        htmlForm,
        gatewayRef: orderRefNum,
      };
    } catch (error) {
      this.logger.error('Easypaisa initiation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyPayment(referenceId: string): Promise<PaymentVerificationResult> {
    try {
      // Easypaisa direct API verification
      const credentials = Buffer.from(
        `${this.config.username}:${this.config.password}`,
      ).toString('base64');

      const response = await fetch(
        `${this.config.url.replace('/Index.jsf', '/inquire')}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            credentials: credentials,
          },
          body: JSON.stringify({
            orderId: referenceId,
            storeId: this.config.storeId,
          }),
        },
      );

      const result = await response.json();

      // Response code 0000 = success
      const isPaid = result.responseCode === '0000';

      return {
        success: true,
        status: isPaid ? 'paid' : 'pending',
        transactionId: result.transactionId,
        amount: parseFloat(result.transactionAmount),
      };
    } catch (error) {
      this.logger.error('Easypaisa verification error:', error);
      return {
        success: false,
        status: 'failed',
        error: error.message,
      };
    }
  }

  async handleCallback(data: any): Promise<CallbackResult> {
    try {
      const responseCode = data.responseCode;
      const orderRefNum = data.orderRefNum || data.orderId;
      const transactionId = data.transactionId;
      const amount = parseFloat(data.transactionAmount || data.amount);

      // Response code 0000 = success
      const isPaid = responseCode === '0000';

      return {
        success: true,
        orderId: orderRefNum,
        transactionId,
        status: isPaid ? 'paid' : 'failed',
        amount,
      };
    } catch (error) {
      this.logger.error('Easypaisa callback error:', error);
      return {
        success: false,
        orderId: '',
        status: 'failed',
      };
    }
  }
}
