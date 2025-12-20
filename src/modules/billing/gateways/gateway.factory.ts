import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import { IPaymentGateway } from '../interfaces/payment-gateway.interface';
import { PaymentMethod } from '../enums/payment-method.enum';

export const BANK_TRANSFER_GATEWAY = 'BANK_TRANSFER_GATEWAY';
export const ALFAPAY_GATEWAY = 'ALFAPAY_GATEWAY';
export const JAZZCASH_GATEWAY = 'JAZZCASH_GATEWAY';
export const EASYPAISA_GATEWAY = 'EASYPAISA_GATEWAY';

@Injectable()
export class PaymentGatewayFactory {
  constructor(
    @Inject(BANK_TRANSFER_GATEWAY) private bankTransfer: IPaymentGateway,
    @Inject(ALFAPAY_GATEWAY) private alfapay: IPaymentGateway,
    @Inject(JAZZCASH_GATEWAY) private jazzcash: IPaymentGateway,
    @Inject(EASYPAISA_GATEWAY) private easypaisa: IPaymentGateway,
  ) {}

  getGateway(method: PaymentMethod): IPaymentGateway {
    switch (method) {
      case PaymentMethod.bank_transfer:
        return this.bankTransfer;
      case PaymentMethod.alfapay:
        return this.alfapay;
      case PaymentMethod.jazzcash:
        return this.jazzcash;
      case PaymentMethod.easypaisa:
        return this.easypaisa;
      default:
        throw new BadRequestException(`Unknown payment method: ${method}`);
    }
  }

  getAllGateways(): IPaymentGateway[] {
    return [this.bankTransfer, this.alfapay, this.jazzcash, this.easypaisa];
  }
}
