import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { PostPaymentDto } from './dto/post-payment.dto';
import { OrderLoggingService } from './logging.service';
import { OrderEvents } from '@/src/types/order';

@Injectable()
export class OrderPaymentService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private orderLoggingService: OrderLoggingService,
  ) {}

  async create(orderId: number, body: PostPaymentDto, user: RequestUser) {
    const payment = await this.prismaTenant.orderPayment.create({
      data: { ...body, order: { connect: { id: orderId } } },
      relationLoadStrategy: 'join',
      select: {
        orderId: true,
        id: true,
        bank: true,
        amount: true,
        tId: true,
        type: true,
        note: true,
      },
    });
    await this.orderLoggingService.create(
      user.id,
      orderId,
      OrderEvents.paymentAdded,
    );

    return payment;
  }
}
