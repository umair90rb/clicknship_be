import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
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
    { id, productId, total, ...body }: CreateItemDto,
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

  async update(
    orderId: number,
    itemId: number,
    body: UpdateItemDto,
    user: RequestUser,
  ) {
    const item = await this.prismaTenant.orderItem.update({
      where: { orderId, id: itemId },
      data: body,
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
      OrderEvents.itemUpdated,
    );
    return item;
  }

  async delete(orderId: number, itemId: number, user: RequestUser) {
    const item = await this.prismaTenant.orderItem.delete({
      where: { id: itemId, orderId },
    });
    await this.orderLoggingService.create(
      user.id,
      orderId,
      OrderEvents.itemDeleted,
    );
    return item;
  }
}
