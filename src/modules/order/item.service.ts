import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { PostItemDto } from './dto/post-item.dto';
import { OrderLoggingService } from './logging.service';
import { OrderEvents } from '@/src/types/order';

@Injectable()
export class OrderItemService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private orderLoggingService: OrderLoggingService,
  ) {}

  async create(
    orderId: number,
    { id, productId, total, ...body }: PostItemDto,
    user: RequestUser,
  ) {
    const item = await this.prismaTenant.orderItem.create({
      data: {
        ...body,
        productId: productId || id.toString(),
        order: { connect: { id: orderId } },
      },
      relationLoadStrategy: 'join',
      select: {
        orderId: true,
        id: true,
        name: true,
        unitPrice: true,
        grams: true,
        quantity: true,
        discount: true,
        sku: true,
        productId: true,
        variantId: true,
      },
    });
    await this.orderLoggingService.create(
      user.id,
      orderId,
      OrderEvents.itemAdded,
    );
    return item;
  }
}
