import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { SearchCustomerDto } from '../dto/customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  list() {}
  get(id: number) {}

  async find(body: SearchCustomerDto) {
    const { withAddress, withOrders, ...nameOrPhone } = body;
    return this.prismaTenant.customer.findFirst({
      where: nameOrPhone,
      relationLoadStrategy: 'join',
      select: {
        id: true,
        email: true,
        name: true,
        ...(withAddress
          ? {
              addresses: {
                select: {
                  id: true,
                  address: true,
                  city: true,
                  note: true,
                },
              },
            }
          : {}),
        ...(withOrders
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
  }

  create(body: any, user: RequestUser) {}
  update(user: RequestUser, id: number, body: any) {}
  delete(user: RequestUser, id: number) {}
}
