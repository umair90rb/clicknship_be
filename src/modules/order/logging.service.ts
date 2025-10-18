import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { PostItemDto } from './dto/post-item.dto';

@Injectable()
export class OrderLoggingService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  list(orderId: number) {
    return this.prismaTenant.orderLog.findMany({
      where: { orderId },
    });
  }

  create(userId: number, orderId: number, event: string) {
    return this.prismaTenant.orderLog.create({
      data: {
        event,
        order: { connect: { id: orderId } },
        user: { connect: { id: userId } },
      },
    });
  }
}
