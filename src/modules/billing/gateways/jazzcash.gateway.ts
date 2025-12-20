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
export class JazzCashGateway implements IPaymentGateway {
  name = 'jazzcash';
  private readonly logger = new Logger(JazzCashGateway.name);

  private get config() {
    return {
      url: process.env.JAZZCASH_URL || 'https://sandbox.jazzcash.com.pk/CustomerPortal/transactionmanagement/merchantform/',
      merchantId: process.env.JAZZCASH_MERCHANT_ID,
      password: process.env.JAZZCASH_PASSWORD,
      hashKey: process.env.JAZZCASH_HASHKEY,
      returnUrl: process.env.JAZZCASH_RETURN_URL,
    };
  }

  private generateHash(data: string): string {
    return CryptoJS.HmacSHA256(data, this.config.hashKey).toString();
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}${hours}${minutes}${seconds}`;
  }

  async initiatePayment(data: InitiatePaymentDto): Promise<PaymentInitiationResult> {
    try {
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // +24 hours

      const txnRefNo = `JC_${Date.now()}_${data.orderId}`;
      const txnDateTime = this.formatDate(now);
      const txnExpiryDateTime = this.formatDate(expiryDate);

      const params: Record<string, string> = {
        pp_Version: '1.1',
        pp_TxnType: 'MWALLET',
        pp_Language: 'EN',
        pp_MerchantID: this.config.merchantId,
        pp_SubMerchantID: '',
        pp_Password: this.config.password,
        pp_BankID: 'TBANK',
        pp_ProductID: 'RETL',
        pp_TxnRefNo: txnRefNo,
        pp_Amount: (data.amount * 100).toString(), // In paisa
        pp_TxnCurrency: 'PKR',
        pp_TxnDateTime: txnDateTime,
        pp_BillReference: data.orderId,
        pp_Description: `Recharge for tenant ${data.tenantId}`,
        pp_TxnExpiryDateTime: txnExpiryDateTime,
        pp_ReturnURL: data.returnUrl,
        ppmpf_1: data.customerEmail || '',
        ppmpf_2: data.customerPhone || '',
        ppmpf_3: '',
        ppmpf_4: '',
        ppmpf_5: '',
      };

      // Generate secure hash
      const hashString = Object.keys(params)
        .sort()
        .filter((key) => params[key] !== '')
        .map((key) => params[key])
        .join('&');

      params.pp_SecureHash = this.generateHash(hashString);

      // Build HTML form for redirect
      const formFields = Object.entries(params)
        .map(([key, value]) => `<input type="hidden" name="${key}" value="${value}">`)
        .join('\n');

      const htmlForm = `
        <html>
        <body onload="document.forms['jazzcash'].submit()">
          <form name="jazzcash" method="POST" action="${this.config.url}">
            ${formFields}
          </form>
        </body>
        </html>
      `;

      return {
        success: true,
        htmlForm,
        gatewayRef: txnRefNo,
      };
    } catch (error) {
      this.logger.error('JazzCash initiation error:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async verifyPayment(referenceId: string): Promise<PaymentVerificationResult> {
    // JazzCash verification is done via callback
    return {
      success: true,
      status: 'pending',
      transactionId: referenceId,
    };
  }

  async handleCallback(data: any): Promise<CallbackResult> {
    try {
      const responseCode = data.pp_ResponseCode;
      const txnRefNo = data.pp_TxnRefNo;
      const amount = parseFloat(data.pp_Amount) / 100; // Convert from paisa

      // Verify the hash
      const receivedHash = data.pp_SecureHash;
      const hashParams = { ...data };
      delete hashParams.pp_SecureHash;

      const hashString = Object.keys(hashParams)
        .sort()
        .filter((key) => hashParams[key] !== '')
        .map((key) => hashParams[key])
        .join('&');

      const calculatedHash = this.generateHash(hashString);

      if (receivedHash !== calculatedHash) {
        this.logger.warn('JazzCash hash mismatch');
        return {
          success: false,
          orderId: txnRefNo,
          status: 'failed',
        };
      }

      // Response code 000 = success
      const isPaid = responseCode === '000';

      return {
        success: true,
        orderId: txnRefNo,
        transactionId: data.pp_RetrievalReferenceNo,
        status: isPaid ? 'paid' : 'failed',
        amount,
      };
    } catch (error) {
      this.logger.error('JazzCash callback error:', error);
      return {
        success: false,
        orderId: '',
        status: 'failed',
      };
    }
  }
}
