import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { OrderStatus } from '@/src/types/order';
import { RequestUser } from '@/src/types/auth';

@Injectable()
export class OrderService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private includeRelations = {
    include: {
      items: true,
      address: true,
      payments: true,
      delivery: true,
      customer: true,
      channel: true,
      brand: true,
      user: true,
      logs: true,
    },
  };

  async list(skip?: number, take?: number, filters?: any) {
    const where: any = {
      deletedAt: null,
    };

    if (filters.status)
      where.status = { equals: filters.status, mode: 'insensitive' };

    if (filters.city) {
      where.address = { city: { contains: filters.city, mode: 'insensitive' } };
    }

    const [orders, total] = await Promise.all([
      this.prismaTenant.order.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          orderNumber: true,
          totalAmount: true,
          createdAt: true,
          status: true,
          tags: true,
          channel: { select: { name: true } },
          address: {
            select: { address: true, city: true, phone: true, province: true },
          },
          customer: { select: { name: true, phone: true } },
        },
      }),
      this.prismaTenant.order.count({ where }),
    ]);

    return {
      data: orders,
      meta: { total, skip, take },
    };
  }

  async find(id: number) {
    const order = await this.prismaTenant.order.findFirst({
      where: { id, deletedAt: null },
      ...this.includeRelations,
    });

    if (!order) throw new NotFoundException('Order not found');
    return { data: order };
  }

  async create(user: RequestUser, createDto: CreateOrderDto) {
    const {
      items,
      address,
      payments,
      tags,
      customer,
      channelId,
      brandId,
      status,
      courierServiceId,
      remarks,
      totalAmount,
      totalDiscount,
      totalTax,
    } = createDto;
    const { id: existingCustomerId, ...customerData } = customer;
    const { id: existingAddressId, ...addressData } = address;
    console.log(user);
    return this.prismaTenant.order.create({
      data: {
        ...(user?.id
          ? { user: { connect: { id: user.id } }, assignedAt: new Date() }
          : {}),
        status,
        remarks,
        totalAmount,
        totalDiscount,
        totalTax,
        tags: tags ?? [],
        items: items ? { create: items } : undefined,
        payments: payments ? { create: payments } : undefined,
        channel: { connect: { id: channelId } },
        brand: { connect: { id: brandId } },
        ...(courierServiceId
          ? { courerService: { connect: { id: courierServiceId } } }
          : {}),
        address: {
          connectOrCreate: {
            where: { id: existingAddressId ?? 0 },
            create: addressData,
          },
        },
        customer: {
          connectOrCreate: {
            where: { id: existingCustomerId ?? 0 },
            create: customerData,
          },
        },
      },
      include: {
        user: true,
        items: true,
        address: true,
        payments: true,
        customer: true,
        channel: true,
      },
    });
  }

  async update(user: RequestUser, id: number, updateDto: UpdateOrderDto) {
    const existing = await this.prismaTenant.order.findUnique({
      where: { id, deletedAt: { equals: null } },
      select: { userId: true, status: true },
    });

    if (!existing) {
      throw new NotFoundException('Order not found');
    }

    // TODO: how to handle this -> add a middleware that add user permisions in request and then pick permission from user obj
    // check if user has permission to "update-confirmed-order" then allow otherwise throw forbidden exception
    if (
      existing.status === OrderStatus.confirmed &&
      user.id !== existing.userId
    ) {
      throw new ForbiddenException('Order already confirmed');
    }

    const {
      items,
      address,
      payments,
      tags,
      customer,
      channelId,
      brandId,
      status,
      courierServiceId,
      remarks,
      totalAmount,
      totalDiscount,
      totalTax,
    } = updateDto;
    const { id: existingCustomerId, ...customerData } = customer;
    const { id: existingAddressId, ...addressData } = address;

    //TODO: update in a way to that if value existed then update it otherwise skip it, etc ...(condition ? {key: value} : {})

    const updated = await this.prismaTenant.order.update({
      where: { id },
      data: {
        ...(user?.id
          ? { user: { connect: { id: user.id } }, assignedAt: new Date() }
          : {}),
        status,
        remarks,
        totalAmount,
        totalDiscount,
        totalTax,
        tags: tags ?? [],
        items: items ? { create: items } : undefined,
        payments: payments ? { create: payments } : undefined,
        channel: { connect: { id: channelId } },
        brand: { connect: { id: brandId } },
        ...(courierServiceId
          ? { courerService: { connect: { id: courierServiceId } } }
          : {}),
        address: {
          connectOrCreate: {
            where: { id: existingAddressId ?? 0 },
            create: addressData,
          },
        },
        customer: {
          connectOrCreate: {
            where: { id: existingCustomerId ?? 0 },
            create: customerData,
          },
        },
      },
      include: {
        user: true,
        items: true,
        address: true,
        payments: true,
        customer: true,
        channel: true,
      },
    });

    return updated;
  }

  async delete(id: number) {
    const existing = await this.prismaTenant.order.findUnique({
      where: { id },
    });
    if (!existing || existing.deletedAt)
      throw new NotFoundException('Order not found');

    return this.prismaTenant.order.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // async updatePartial(id: number, updateDto: UpdateOrderDto) {
  //   const existing = await this.prismaTenant.order.findUnique({
  //     where: { id },
  //     include: { items: true, payments: true, address: true, delivery: true },
  //   });
  //   if (!existing || existing.deletedAt)
  //     throw new NotFoundException('Order not found');

  //   const { items, payments, address, delivery, tags, ...rest } =
  //     updateDto as any;

  //   const data: any = {};

  //   // Only attach fields that are present in request
  //   Object.keys(rest).forEach((k) => {
  //     if (rest[k] !== undefined) data[k] = rest[k];
  //   });

  //   if (tags !== undefined) data.tags = tags;

  //   if (address !== undefined) {
  //     // upsert address
  //     data.address = {
  //       upsert: {
  //         create: address,
  //         update: address,
  //       },
  //     };
  //   }

  //   if (delivery !== undefined) {
  //     data.delivery = {
  //       upsert: {
  //         create: delivery,
  //         update: delivery,
  //       },
  //     };
  //   }

  //   if (items !== undefined) {
  //     // Replace items with provided ones
  //     data.items = {
  //       deleteMany: {},
  //       create: items,
  //     };
  //   }

  //   if (payments !== undefined) {
  //     data.payments = {
  //       deleteMany: {},
  //       create: payments,
  //     };
  //   }

  //   const updated = await this.prismaTenant.order.update({
  //     where: { id },
  //     data,
  //     ...this.includeRelations,
  //   });

  //   return updated;
  // }
}
