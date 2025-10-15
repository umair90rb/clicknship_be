import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { PostCommentDto } from './dto/post-comment.dto';
import { RequestUser } from '@/src/types/auth';
import { PostItemDto } from './dto/post-item.dto';

@Injectable()
export class OrderItemService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  create(orderId: number, body: PostItemDto, user: RequestUser) {
    return Promise.all([
      this.prismaTenant.orderItem.create({
        data: { ...body, order: { connect: { id: orderId } } },
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
      }),
      this.prismaTenant.orderLog.create({
        data: {
          event: 'New item added',
          order: { connect: { id: orderId } },
          user: { connect: { id: user.id } },
        },
      }),
    ]);
  }
}
