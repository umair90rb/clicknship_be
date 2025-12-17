import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';

// Controllers
import { InventoryController } from './controllers/inventory.controller';
import { LocationController } from './controllers/location.controller';
import { SupplierController } from './controllers/supplier.controller';
import { PurchaseOrderController } from './controllers/purchase-order.controller';
import { TransferController } from './controllers/transfer.controller';

// Services
import { InventoryService } from './services/inventory.service';
import { MovementService } from './services/movement.service';
import { LocationService } from './services/location.service';
import { SupplierService } from './services/supplier.service';
import { PurchaseOrderService } from './services/purchase-order.service';
import { TransferService } from './services/transfer.service';

@Module({
  imports: [AuthModule],
  controllers: [
    InventoryController,
    LocationController,
    SupplierController,
    PurchaseOrderController,
    TransferController,
  ],
  providers: [
    tenantConnectionProvider,
    InventoryService,
    MovementService,
    LocationService,
    SupplierService,
    PurchaseOrderService,
    TransferService,
  ],
  exports: [InventoryService, MovementService],
})
export class InventoryModule {}
