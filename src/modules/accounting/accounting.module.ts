import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { AccountController } from './controllers/account.controller';
import { FiscalPeriodController } from './controllers/fiscal-period.controller';
import { JournalController } from './controllers/journal.controller';
import { InvoiceController } from './controllers/invoice.controller';
import { BillController } from './controllers/bill.controller';
import { PaymentController } from './controllers/payment.controller';
import { CodRemittanceController } from './controllers/cod-remittance.controller';
import { TaxRateController } from './controllers/tax-rate.controller';

// Services
import { AccountService } from './services/account.service';
import { FiscalPeriodService } from './services/fiscal-period.service';
import { JournalService } from './services/journal.service';
import { AutoEntryService } from './services/auto-entry.service';
import { InvoiceService } from './services/invoice.service';
import { BillService } from './services/bill.service';
import { PaymentService } from './services/payment.service';
import { CodRemittanceService } from './services/cod-remittance.service';
import { TaxRateService } from './services/tax-rate.service';

@Module({
  imports: [AuthModule],
  controllers: [
    AccountController,
    FiscalPeriodController,
    JournalController,
    InvoiceController,
    BillController,
    PaymentController,
    CodRemittanceController,
    TaxRateController,
  ],
  providers: [
    tenantConnectionProvider,
    AccountService,
    FiscalPeriodService,
    JournalService,
    AutoEntryService,
    InvoiceService,
    BillService,
    PaymentService,
    CodRemittanceService,
    TaxRateService,
  ],
  exports: [
    AccountService,
    JournalService,
    AutoEntryService,
    InvoiceService,
    BillService,
    PaymentService,
    CodRemittanceService,
  ],
})
export class AccountingModule {}
