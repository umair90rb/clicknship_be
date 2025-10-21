import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { OrderController } from '@/src/modules/order/controllers/order.controller';
import { OrderService } from '@/src/modules/order/services/order.service';
import { WebhookOrderCreateConsumer } from '@/src/modules/webhook/order.worker';
import { AuthModule } from '@/src/modules/auth/auth.module';
import { OrderCommentService } from '@/src/modules/order/services/comment.service';
import { OrderItemService } from '@/src/modules/order/services/item.service';
import { OrderPaymentService } from '@/src/modules/order/services/payment.service';
import { OrderLoggingService } from '@/src/modules/order/services/logging.service';
import { CustomerService } from '@/src/modules/order/services/customer.service';
import { CustomerController } from '@/src/modules/order/controllers/customer.controller';

@Module({
  imports: [AuthModule],
  controllers: [OrderController, CustomerController],
  providers: [
    OrderService,
    OrderCommentService,
    OrderItemService,
    OrderPaymentService,
    OrderLoggingService,
    CustomerService,
    tenantConnectionProvider,
    WebhookOrderCreateConsumer,
  ],
})
export class OrderModule {}
