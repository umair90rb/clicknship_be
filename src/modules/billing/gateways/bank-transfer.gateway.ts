import { Injectable } from '@nestjs/common';
import {
  IPaymentGateway,
  InitiatePaymentDto,
  PaymentInitiationResult,
  PaymentVerificationResult,
  CallbackResult,
} from '../interfaces/payment-gateway.interface';

@Injectable()
export class BankTransferGateway implements IPaymentGateway {
  name = 'bank_transfer';

  async initiatePayment(data: InitiatePaymentDto): Promise<PaymentInitiationResult> {
    // Bank transfer doesn't redirect - user manually transfers and uploads screenshot
    return {
      success: true,
      gatewayRef: `BT_${data.orderId}`,
    };
  }

  async verifyPayment(referenceId: string): Promise<PaymentVerificationResult> {
    // Bank transfer verification is done manually by admin
    return {
      success: true,
      status: 'pending',
      transactionId: referenceId,
    };
  }

  async handleCallback(data: any): Promise<CallbackResult> {
    // Bank transfer doesn't have webhooks - manually approved
    return {
      success: true,
      orderId: data.orderId,
      status: 'paid',
    };
  }
}
