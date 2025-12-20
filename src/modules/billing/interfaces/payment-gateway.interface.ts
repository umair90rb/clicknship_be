export interface InitiatePaymentDto {
  tenantId: string;
  amount: number;
  orderId: string;
  returnUrl: string;
  webhookUrl: string;
  customerEmail?: string;
  customerPhone?: string;
}

export interface PaymentInitiationResult {
  success: boolean;
  redirectUrl?: string;
  htmlForm?: string;
  gatewayRef?: string;
  error?: string;
}

export interface PaymentVerificationResult {
  success: boolean;
  status: 'paid' | 'pending' | 'failed';
  transactionId?: string;
  amount?: number;
  error?: string;
}

export interface CallbackResult {
  success: boolean;
  orderId: string;
  transactionId?: string;
  status: 'paid' | 'failed';
  amount?: number;
}

export interface IPaymentGateway {
  name: string;

  initiatePayment(data: InitiatePaymentDto): Promise<PaymentInitiationResult>;

  verifyPayment(referenceId: string): Promise<PaymentVerificationResult>;

  handleCallback(data: any): Promise<CallbackResult>;
}
