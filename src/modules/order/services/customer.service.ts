import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { ListCustomerBodyDto, SearchCustomerDto } from '../dto/customer.dto';

@Injectable()
export class CustomerService {
  private select = { id: true, name: true, phone: true, email: true };
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: ListCustomerBodyDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.name) {
      where.name = { contains: filters.name, mode: 'insensitive' };
    }

    if (filters.email) {
      where.email = { contains: filters.email, mode: 'insensitive' };
    }

    if (filters.phone) {
      where.phone = { contains: filters.phone, mode: 'insensitive' };
    }

    const [total, customers] = await Promise.all([
      this.prismaTenant.customer.count({ where }),
      this.prismaTenant.customer.findMany({
        where,
        skip,
        take,
        select: { ...this.select, _count: { select: { orders: true } } },
      }),
    ]);

    return {
      data: customers,
      meta: { total, skip, take, ...filters },
    };
  }

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
