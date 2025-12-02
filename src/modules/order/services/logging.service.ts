import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';

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

  create(userId: number, orderIds: number[], event: string) {
    return this.prismaTenant.orderLog.createMany({
      data: orderIds.map((orderId) => ({
        event,
        orderId,
        userId,
      })),
      skipDuplicates: true,
    });
  }
}
