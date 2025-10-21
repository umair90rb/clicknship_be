import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { PostCommentDto } from '@/src/modules/order/dto/post-comment.dto';
import { RequestUser } from '@/src/types/auth';
import { SearchCustomerDto } from '../dto/search-customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  list() {}
  get(id: number) {}

  async find(body: SearchCustomerDto) {
    const { name, phone, withAddress, withOrders } = body;
    const customer = await this.prismaTenant.customer.findFirst({
      where: {
        ...(phone ? { phone } : {}),
        ...(name ? { name } : {}),
      },
      relationLoadStrategy: 'join',
      select: {
        id: true,
        phone: true,
        email: true,
        name: true,
        ...(withAddress || withOrders
          ? {
              orders: {
                select: {
                  id: true,
                  status: true,
                },
              },
            }
          : {}),
      },
    });
    if (withAddress && customer && customer.orders.length) {
      const address = await this.prismaTenant.address.findMany({
        select: {
          id: true,
          address: true,
          city: true,
          note: true,
          order: { select: { id: true, status: true } },
        },
        where: { orderId: { in: customer.orders.map((o) => o.id) } },
      });
      return { ...customer, address };
    }
    return customer;
  }

  create(body: any, user: RequestUser) {}

  update(user: RequestUser, id: number, body: any) {}
  delete(user: RequestUser, id: number) {}
}
