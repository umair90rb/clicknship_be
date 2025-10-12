import { Module } from '@nestjs/common';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { WebhookOrderCreateConsumer } from '../webhook/order.worker';
import { AuthModule } from '../auth/auth.module';
import { OrderCommentService } from './comment.service';

@Module({
  imports: [AuthModule],
  controllers: [OrderController],
  providers: [
    OrderService,
    OrderCommentService,
    tenantConnectionProvider,
    WebhookOrderCreateConsumer,
  ],
})
export class OrderModule {}
