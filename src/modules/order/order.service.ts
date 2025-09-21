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
import { ListOrdersBodyDto } from './dto/list-order.dto';

@Injectable()
export class OrderService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: ListOrdersBodyDto) {
    const { skip, take, ...filters } = body;
    const where: any = {
      deletedAt: null,
    };

    // String filters (simple contains)
    if (filters.orderNumber) {
      where.orderNumber = {
        contains: filters.orderNumber,
        mode: 'insensitive',
      };
    }

    if (filters.channel) {
      where.channel = {
        name: {
          contains: filters.channel,
          mode: 'insensitive',
        },
      };
    }

    if (filters.name || filters.phone) {
      where.customer = {};
      if (filters.name) {
        where.customer.name = {
          contains: filters.name,
          mode: 'insensitive',
        };
      }

      if (filters.phone) {
        where.customer.phone = {
          contains: filters.phone,
          mode: 'insensitive',
        };
      }
    }

    // Nested address filters
    if (filters.address || filters.city) {
      where.address = {};

      if (filters.address) {
        where.address.address = {
          contains: filters.address,
          mode: 'insensitive',
        };
      }

      if (filters.city) {
        where.address.city = {
          contains: filters.city,
          mode: 'insensitive',
        };
      }
    }

    // Status (array of enums/strings)
    if (filters.status?.length) {
      where.status = {
        in: filters.status,
        mode: 'insensitive', // if status is string, keep case-insensitive
      };
    }
    if (filters.tags?.length) {
      where.tags = {
        hasSome: filters.tags,
      };
    }

    // Ranges (numeric or datetime)
    if (filters.totalAmount) {
      const { min, max } = filters.totalAmount;
      where.totalAmount = {};
      if (min !== undefined && min !== null && min !== '') {
        where.totalAmount.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.totalAmount.lte = Number(max);
      }
    }

    if (filters.createdAt) {
      const { min, max } = filters.createdAt;
      where.createdAt = {};
      if (min) {
        where.createdAt.gte = new Date(min);
      }
      if (max) {
        where.createdAt.lte = new Date(max);
      }
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
      meta: { total, skip, take, ...filters },
    };
  }

  async find(id: number) {
    const order = await this.prismaTenant.order.findFirst({
      where: { id, deletedAt: null },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        createdAt: true,
        remarks: true,
        tags: true,
        totalAmount: true,
        totalDiscount: true,
        totalTax: true,
        assignedAt: true,
        courerService: true,
        items: true,
        address: true,
        payments: true,
        delivery: true,
        customer: true,
        channel: true,
        comments: {
          select: {
            id: true,
            comment: true,
            createdAt: true,
            user: { select: { id: true, name: true } },
          },
        },
        brand: true,
        user: { select: { name: true, id: true, phone: true, email: true } },
        logs: {
          select: {
            id: true,
            event: true,
            createdAt: true,
            user: { select: { name: true, id: true } },
          },
        },
      },
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
    } = createDto || {};
    const { id: existingCustomerId, ...customerData } = customer || {};
    const { id: existingAddressId, ...addressData } = address || {};
    return this.prismaTenant.order.create({
      relationLoadStrategy: 'join',
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
      comments,
      totalAmount,
      totalDiscount,
      totalTax,
    } = updateDto || {};
    const { id: existingCustomerId, ...customerData } = customer || {};
    const { id: existingAddressId, ...addressData } = address || {};

    //TODO: update in a way to that if value existed then update it otherwise skip it, etc ...(condition ? {key: value} : {})
    const updated = await this.prismaTenant.order.update({
      relationLoadStrategy: 'join',
      where: { id },
      data: {
        ...(user?.id
          ? { user: { connect: { id: user.id } }, assignedAt: new Date() }
          : {}),
        ...(status !== undefined ? { status } : {}),
        ...(remarks !== undefined ? { remarks } : {}),
        ...(totalAmount !== undefined ? { totalAmount } : {}),
        ...(totalDiscount !== undefined ? { totalDiscount } : {}),
        ...(totalTax !== undefined ? { totalTax } : {}),
        ...(tags !== undefined ? { tags } : {}),
        ...(channelId ? { channel: { connect: { id: channelId } } } : {}),
        ...(brandId ? { brand: { connect: { id: brandId } } } : {}),
        ...(courierServiceId
          ? { courierService: { connect: { id: courierServiceId } } }
          : {}),
        ...(payments
          ? {
              payments: {
                deleteMany: {
                  orderId: id,
                  NOT: payments.filter((p) => p.id).map((p) => ({ id: p.id })),
                },
                upsert: payments.map((payment) => ({
                  where: { id: payment.id ?? 0 },
                  update: {
                    type: payment.type,
                    tId: payment.tId,
                    bank: payment.bank,
                    amount: payment.amount,
                    note: payment.note,
                  },
                  create: {
                    type: payment.type,
                    tId: payment.tId,
                    bank: payment.bank,
                    amount: payment.amount,
                    note: payment.note,
                  },
                })),
              },
            }
          : {}),
        ...(comments
          ? {
              comments: {
                deleteMany: {
                  orderId: id,
                  NOT: comments.filter((c) => c.id).map((c) => ({ id: c.id })),
                },
                upsert: comments.map((comment) => ({
                  where: { id: comment.id ?? 0 },
                  update: {
                    comment: comment.comment,
                  },
                  create: {
                    comment: comment.comment,
                  },
                })),
              },
            }
          : {}),
        ...(items
          ? {
              items: {
                deleteMany: {
                  orderId: id,
                  NOT: items.filter((i) => i.id).map((i) => ({ id: i.id })),
                },
                upsert: items.map((item) => ({
                  where: { id: item.id ?? 0 },
                  update: {
                    name: item.name,
                    grams: item.grams,
                    discount: item.discount,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  },
                  create: {
                    name: item.name,
                    grams: item.grams,
                    discount: item.discount,
                    sku: item.sku,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  },
                })),
              },
            }
          : {}),
        ...(Object.keys(addressData).length
          ? {
              address: {
                update: {
                  ...('address' in addressData
                    ? { address: addressData.address }
                    : {}),
                  ...('note' in addressData ? { note: addressData.note } : {}),
                  ...('city' in addressData ? { city: addressData.city } : {}),
                  ...('province' in addressData
                    ? { province: addressData.province }
                    : {}),
                  ...('country' in addressData
                    ? { country: addressData.country }
                    : {}),
                },
              },
            }
          : {}),
        ...(Object.keys(customerData).length
          ? {
              customer: {
                update: {
                  ...('name' in customerData
                    ? { name: customerData?.name }
                    : {}),
                  ...('email' in customerData
                    ? { email: customerData.email }
                    : {}),
                  ...('phone' in customerData
                    ? { phone: customerData.phone }
                    : {}),
                },
              },
            }
          : {}),
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
}
