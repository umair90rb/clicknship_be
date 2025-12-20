import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { OrderController } from '@/src/modules/order/controllers/order.controller';
import { OrderService } from '@/src/modules/order/services/order.service';
import { AuthModule } from '@/src/modules/auth/auth.module';
import { OrderCommentService } from '@/src/modules/order/services/comment.service';
import { OrderItemService } from '@/src/modules/order/services/item.service';
import { OrderPaymentService } from '@/src/modules/order/services/payment.service';
import { OrderLoggingService } from '@/src/modules/order/services/logging.service';
import { CustomerService } from '@/src/modules/order/services/customer.service';
import { CustomerController } from '@/src/modules/order/controllers/customer.controller';
import { ProductService } from '@/src/modules/order/services/product.service';
import { ProductController } from '@/src/modules/order/controllers/product.controller';
import { BillingModule } from '@/src/modules/billing/billing.module';

@Module({
  imports: [AuthModule, BillingModule],
  controllers: [OrderController, CustomerController, ProductController],
  providers: [
    OrderService,
    OrderCommentService,
    OrderItemService,
    OrderPaymentService,
    OrderLoggingService,
    CustomerService,
    ProductService,
    tenantConnectionProvider,
  ],
  exports: [OrderService],
})
export class OrderModule {}
