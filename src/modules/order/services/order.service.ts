import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  CreateOrderDto,
  UpdateOrderDto,
  ListOrdersBodyDto,
} from '@/src/modules/order/dto/order.dto';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { OrderEvents, OrderStatus } from '@/src/types/order';
import { RequestUser } from '@/src/types/auth';
import { OrderLoggingService } from '@/src/modules/order/services/logging.service';

@Injectable()
export class OrderService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private orderLoggingService: OrderLoggingService,
  ) {}

  private select = {
    id: true,
    orderNumber: true,
    status: true,
    createdAt: true,
    remarks: true,
    tags: true,
    totalAmount: true,
    totalDiscount: true,
    shippingCharges: true,
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
  };

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
      select: this.select,
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
    let upsertCustomer = await this.prismaTenant.customer.findFirst({
      where: {
        OR: [{ id: existingCustomerId || 0 }, { phone: customer.phone }],
      },
    });
    if (!upsertCustomer) {
      upsertCustomer = await this.prismaTenant.customer.create({
        data: customerData,
      });
    }
    const order = await this.prismaTenant.order.create({
      select: this.select,
      relationLoadStrategy: 'join',
      data: {
        user: { connect: { id: user.id } },
        assignedAt: new Date(),
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
          create: {
            ...addressData,
            customer: { connect: { id: upsertCustomer.id } },
          },
        },
        customer: { connect: { id: upsertCustomer.id } },
      },
    });
    await this.orderLoggingService.create(
      user.id,
      order.id,
      OrderEvents.created,
    );
    return order;
  }

  async update(user: RequestUser, orderId: number, updateDto: UpdateOrderDto) {
    const order = await this.isOrderExist(orderId);

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // TODO: how to handle this -> add a middleware that add user permisions in request and then pick permission from user obj
    // check if user has permission to "update-confirmed-order" then allow otherwise throw forbidden exception
    if (order.status === OrderStatus.confirmed && user.id !== order.userId) {
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
      shippingCharges,
    } = updateDto || {};
    const { id: existingCustomerId, ...customerData } = customer || {};
    const { id: existingAddressId, ...addressData } = address || {};

    //TODO: update in a way to that if value existed then update it otherwise skip it, etc ...(condition ? {key: value} : {})
    const updated = await this.prismaTenant.order.update({
      select: this.select,
      relationLoadStrategy: 'join',
      where: { id: orderId },
      data: {
        ...(user?.id
          ? { user: { connect: { id: user.id } }, assignedAt: new Date() }
          : {}),
        ...(shippingCharges !== undefined ? { shippingCharges } : {}),
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
                  orderId,
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
                  orderId,
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
                  orderId,
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
    });
    await this.orderLoggingService.create(
      user.id,
      orderId,
      OrderEvents.updated,
    );
    return updated;
  }

  async updateStatus(user: RequestUser, orderId: number, status: string) {
    const order = await this.isOrderExist(orderId);
    if (!order) throw new NotFoundException('Order not found');
    const updated = this.prismaTenant.order.update({
      where: { id: orderId },
      data: { status },
      select: { status: true },
    });
    await this.orderLoggingService.create(
      user.id,
      orderId,
      OrderEvents.statusUpdated
        .replace('{to}', order.status)
        .replace('{from}', status),
    );
    return updated;
  }

  async delete(user: RequestUser, orderId: number) {
    const order = await this.isOrderExist(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const deleted = await this.prismaTenant.order.update({
      where: { id: orderId },
      data: { deletedAt: new Date() },
    });
    await this.orderLoggingService.create(
      user.id,
      orderId,
      OrderEvents.deleted,
    );
    return deleted;
  }

  isOrderExist(id: number) {
    return this.prismaTenant.order.findUnique({
      where: { id, deletedAt: null },
      select: { userId: true, status: true },
    });
  }
}
