import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';

@Injectable()
export class OrderService {
    constructor(
        @Inject(TENANT_CONNECTION_PROVIDER)
        private prismaTenant: PrismaTenantClient) { }

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

    async create(createDto: CreateOrderDto) {
        const {
            items,
            address,
            payments,
            tags,
            ...rest
        } = createDto;

        return this.prismaTenant.order.create({
            data: {
                ...rest,
                tags: tags ?? [],
                items: items ? { create: items } : undefined,
                address: address ? { create: address } : undefined,
            },
            ...this.includeRelations,
        });
    }

    async findOne(id: number) {
        const order = await this.prismaTenant.order.findFirst({
            where: { id, deletedAt: null },
            ...this.includeRelations,
        });

        if (!order) throw new NotFoundException('Order not found');
        return order;
    }

    async updateFull(id: number, updateDto: CreateOrderDto) {
        // This is used by PUT (full replace)
        // For nested arrays we remove old related records and recreate them
        const existing = await this.prismaTenant.order.findUnique({
            where: { id },
            include: { items: true, payments: true },
        });

        if (!existing || existing.deletedAt) throw new NotFoundException('Order not found');

        const {
            items,
            payments,
            address,
            tags,
            ...rest
        } = updateDto;

        // Build data object
        const data: any = {
            ...rest,
            tags: tags ?? [],
        };

        // nested handling
        if (address) {
            data.address = {
                upsert: {
                    create: address,
                    update: address,
                },
            };
        } else {
            // If full replace and address is not provided, remove it
            data.address = {
                delete: true,
            };
        }

        if (items) {
            data.items = {
                deleteMany: {}, // remove all existing items for this order
                create: items,
            };
        } else {
            // If full replace and no items provided, remove all items
            data.items = {
                deleteMany: {},
            };
        }

        if (payments) {
            data.payments = {
                deleteMany: {},
                create: payments,
            };
        } else {
            data.payments = {
                deleteMany: {},
            };
        }

        const updated = await this.prismaTenant.order.update({
            where: { id },
            data,
            ...this.includeRelations,
        });

        return updated;
    }

    async updatePartial(id: number, updateDto: UpdateOrderDto) {
        const existing = await this.prismaTenant.order.findUnique({
            where: { id },
            include: { items: true, payments: true, address: true, delivery: true },
        });
        if (!existing || existing.deletedAt) throw new NotFoundException('Order not found');

        const {
            items,
            payments,
            address,
            delivery,
            tags,
            ...rest
        } = updateDto as any;

        const data: any = {};

        // Only attach fields that are present in request
        Object.keys(rest).forEach((k) => {
            if (rest[k] !== undefined) data[k] = rest[k];
        });

        if (tags !== undefined) data.tags = tags;

        if (address !== undefined) {
            // upsert address
            data.address = {
                upsert: {
                    create: address,
                    update: address,
                },
            };
        }

        if (delivery !== undefined) {
            data.delivery = {
                upsert: {
                    create: delivery,
                    update: delivery,
                },
            };
        }

        if (items !== undefined) {
            // Replace items with provided ones
            data.items = {
                deleteMany: {},
                create: items,
            };
        }

        if (payments !== undefined) {
            data.payments = {
                deleteMany: {},
                create: payments,
            };
        }

        const updated = await this.prismaTenant.order.update({
            where: { id },
            data,
            ...this.includeRelations,
        });

        return updated;
    }

    async softDelete(id: number) {
        const existing = await this.prismaTenant.order.findUnique({ where: { id } });
        if (!existing || existing.deletedAt) throw new NotFoundException('Order not found');

        return this.prismaTenant.order.update({
            where: { id },
            data: { deletedAt: new Date() },
        });
    }

    async list(query: {
        page?: number;
        pageSize?: number;
        status?: string;
        city?: string;
        orderNumber?: string;
        customerName?: string;
        customerPhone?: string;
    }) {
        const page = query.page && query.page > 0 ? query.page : 1;
        const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20;

        const where: any = {
            deletedAt: null,
        };

        if (query.status) where.status = { equals: query.status };
        if (query.orderNumber) where.orderNumber = { contains: query.orderNumber, mode: 'insensitive' };

        if (query.city) {
            where.address = { city: { contains: query.city, mode: 'insensitive' } };
        }

        if (query.customerName) {
            where.customer = { name: { contains: query.customerName, mode: 'insensitive' } };
        }

        if (query.customerPhone) {
            where.customer = { phone: { contains: query.customerPhone, mode: 'insensitive' } };
        }

        const [items, total] = await Promise.all([
            this.prismaTenant.order.findMany({
                where,
                ...this.includeRelations,
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prismaTenant.order.count({ where }),
        ]);

        return {
            data: items,
            meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) },
        };
    }
}
