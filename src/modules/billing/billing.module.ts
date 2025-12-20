import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { S3Service } from '@/src/services/s3.service';

// Controllers
import { BillingController } from './controllers/billing.controller';
import { RechargeController } from './controllers/recharge.controller';
import { WebhookController } from './controllers/webhook.controller';
import { AdminBillingController } from './controllers/admin-billing.controller';

// Services
import { BillingService } from './services/billing.service';
import { CreditService } from './services/credit.service';

// Gateways
import {
  PaymentGatewayFactory,
  BANK_TRANSFER_GATEWAY,
  ALFAPAY_GATEWAY,
  JAZZCASH_GATEWAY,
  EASYPAISA_GATEWAY,
} from './gateways/gateway.factory';
import { BankTransferGateway } from './gateways/bank-transfer.gateway';
import { AlfaPayGateway } from './gateways/alfapay.gateway';
import { JazzCashGateway } from './gateways/jazzcash.gateway';
import { EasypaisaGateway } from './gateways/easypaisa.gateway';

// Guard
import { CreditBalanceGuard } from './guards/credit-balance.guard';

@Module({
  imports: [AuthModule],
  controllers: [
    BillingController,
    RechargeController,
    WebhookController,
    AdminBillingController,
  ],
  providers: [
    tenantConnectionProvider,
    PrismaMasterClient,
    S3Service,
    BillingService,
    CreditService,
    CreditBalanceGuard,
    PaymentGatewayFactory,
    {
      provide: BANK_TRANSFER_GATEWAY,
      useClass: BankTransferGateway,
    },
    {
      provide: ALFAPAY_GATEWAY,
      useClass: AlfaPayGateway,
    },
    {
      provide: JAZZCASH_GATEWAY,
      useClass: JazzCashGateway,
    },
    {
      provide: EASYPAISA_GATEWAY,
      useClass: EasypaisaGateway,
    },
  ],
  exports: [BillingService, CreditService, CreditBalanceGuard],
})
export class BillingModule {}
