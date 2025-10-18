import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { WebhookOrderCreateConsumer } from '../webhook/order.worker';
import { AuthModule } from '../auth/auth.module';
import { OrderCommentService } from './comment.service';
import { OrderItemService } from './item.service';
import { OrderPaymentService } from './payment.service';
import { OrderLoggingService } from './logging.service';

@Module({
  imports: [AuthModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderCommentService,
    OrderItemService,
    OrderPaymentService,
    OrderLoggingService,
    tenantConnectionProvider,
    WebhookOrderCreateConsumer,
  ],
})
export class OrderModule {}
