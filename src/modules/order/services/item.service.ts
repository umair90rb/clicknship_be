import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import {
  CreateOrderItemDto,
  UpdateOrderItemDto,
} from '@/src/modules/order/dto/order.dto';
import { OrderLoggingService } from '@/src/modules/order/services/logging.service';
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
    { id, productId, total, ...body }: CreateOrderItemDto,
    user: RequestUser,
  ) {
    let item = await this.prismaTenant.orderItem.findFirst({
      where: { orderId, sku: body.sku },
    });
    if (item) {
      return this.update(
        orderId,
        item.id,
        {
          quantity: body.quantity + item.quantity,
          discount: body.discount + item.discount,
        },
        user,
      );
    } else {
      item = await this.prismaTenant.orderItem.create({
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

  async update(
    orderId: number,
    itemId: number,
    body: UpdateOrderItemDto,
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
    const item = await this.prismaTenant.orderItem.findFirst({
      where: { id: itemId, orderId },
    });
    if (!item) {
      throw new NotFoundException(
        `Order item not found, order id: ${orderId}, item id: ${itemId}`,
      );
    }
    await this.prismaTenant.orderItem.delete({
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
