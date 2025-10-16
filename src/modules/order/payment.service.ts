import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { PostItemDto } from './dto/post-item.dto';
import { PostPaymentDto } from './dto/post-payment.dto';

@Injectable()
export class OrderPaymentService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
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
    await this.prismaTenant.orderLog.create({
      data: {
        event: 'New payment added',
        order: { connect: { id: orderId } },
        user: { connect: { id: user.id } },
      },
    });

    return payment;
  }
}
