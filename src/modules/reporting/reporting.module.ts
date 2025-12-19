import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { OrderReportsController } from './controllers/order-reports.controller';
import { InventoryReportsController } from './controllers/inventory-reports.controller';
import { AccountingReportsController } from './controllers/accounting-reports.controller';

// Services
import { OrderReportsService } from './services/order-reports.service';
import { InventoryReportsService } from './services/inventory-reports.service';
import { AccountingReportsService } from './services/accounting-reports.service';

@Module({
  imports: [AuthModule],
  controllers: [
    OrderReportsController,
    InventoryReportsController,
    AccountingReportsController,
  ],
  providers: [
    tenantConnectionProvider,
    OrderReportsService,
    InventoryReportsService,
    AccountingReportsService,
  ],
  exports: [
    OrderReportsService,
    InventoryReportsService,
    AccountingReportsService,
  ],
})
export class ReportingModule {}
