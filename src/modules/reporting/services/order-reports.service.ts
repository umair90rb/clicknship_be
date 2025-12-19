import { Inject, Injectable } from '@nestjs/common';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { Prisma } from '@/prisma/tenant/client';
import { BaseReportFilterDto } from '../dto/base-filter.dto';
import {
  AgentReportFilterDto,
  ProductReportFilterDto,
  CourierReportFilterDto,
  WebhookReportFilterDto,
  FocReportFilterDto,
  BookedProductValueFilterDto,
} from '../dto/order-report-filters.dto';
import {
  ReportResponse,
  AgentOrderReportRow,
  ProductUnitReportRow,
  BookingUnitReportRow,
  FocUnitReportRow,
  AgentChannelReportRow,
  ChannelOrderReportRow,
  UserIncentiveReportRow,
  CourierDeliveryReportRow,
  CourierDispatchReportRow,
  ChannelOrderGenerationReportRow,
  BookedProductValueReportRow,
} from '../types/report.types';
import { OrderStatus } from '@/src/types/order';

@Injectable()
export class OrderReportsService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private buildOrderWhereClause(filters: BaseReportFilterDto): any {
    const where: any = { deletedAt: null };

    if (filters.brandId) where.brandId = filters.brandId;
    if (filters.channelId) where.channelId = filters.channelId;
    if (filters.courierServiceId) where.courierServiceId = filters.courierServiceId;
    if (filters.city) {
      where.address = { city: { contains: filters.city, mode: 'insensitive' } };
    }
    if (filters.status?.length) {
      where.status = { in: filters.status };
    }
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.createdAt = {};
      if (filters.dateRange.start) where.createdAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end) where.createdAt.lte = new Date(filters.dateRange.end);
    }

    return where;
  }

  // 1. Agent Order Report
  async getAgentOrderReport(
    filters: AgentReportFilterDto,
  ): Promise<ReportResponse<AgentOrderReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.userId = filters.userId ? filters.userId : { not: null };

    const grouped = await this.prismaTenant.order.groupBy({
      by: ['userId', 'status'],
      where,
      _count: { id: true },
    });

    const userIds = [...new Set(grouped.map((g) => g.userId).filter(Boolean))] as number[];
    const users = await this.prismaTenant.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u.name]));

    const aggregated = new Map<number, AgentOrderReportRow>();
    for (const row of grouped) {
      if (!row.userId) continue;

      if (!aggregated.has(row.userId)) {
        aggregated.set(row.userId, {
          userId: row.userId,
          userName: userMap.get(row.userId) || 'Unknown',
          totalOrders: 0,
          confirmedCount: 0,
          assignedCount: 0,
          noPickCount: 0,
          paymentPendingCount: 0,
          cancelCount: 0,
          deliveredCount: 0,
        });
      }

      const agg = aggregated.get(row.userId)!;
      agg.totalOrders += row._count.id;
      agg.assignedCount += row._count.id; // All orders with userId are assigned

      const status = row.status?.toLowerCase();
      if (status === OrderStatus.confirmed) agg.confirmedCount += row._count.id;
      else if (status === OrderStatus.noPick) agg.noPickCount += row._count.id;
      else if (status === OrderStatus.paymentPending) agg.paymentPendingCount += row._count.id;
      else if (status === OrderStatus.cancel) agg.cancelCount += row._count.id;
      else if (status === OrderStatus.delivered) agg.deliveredCount += row._count.id;
    }

    return {
      data: Array.from(aggregated.values()),
      meta: {
        total: aggregated.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 2. Product Unit Report
  async getProductUnitReport(
    filters: ProductReportFilterDto,
  ): Promise<ReportResponse<ProductUnitReportRow>> {
    const where = this.buildOrderWhereClause(filters);

    const items = await this.prismaTenant.orderItem.findMany({
      where: {
        order: where,
        ...(filters.productName && {
          name: { contains: filters.productName, mode: 'insensitive' },
        }),
        ...(filters.sku && { sku: filters.sku }),
      },
      select: {
        name: true,
        sku: true,
        quantity: true,
        order: { select: { status: true } },
      },
    });

    const productMap = new Map<string, ProductUnitReportRow>();
    for (const item of items) {
      const key = item.sku || item.name || 'Unknown';

      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: item.name || 'Unknown',
          sku: item.sku || '',
          totalUnits: 0,
          confirmedUnits: 0,
          noPickUnits: 0,
          cancelUnits: 0,
        });
      }

      const prod = productMap.get(key)!;
      const qty = item.quantity || 0;
      prod.totalUnits += qty;

      const status = item.order.status?.toLowerCase();
      if (status === OrderStatus.confirmed) prod.confirmedUnits += qty;
      else if (status === OrderStatus.noPick) prod.noPickUnits += qty;
      else if (status === OrderStatus.cancel) prod.cancelUnits += qty;
    }

    return {
      data: Array.from(productMap.values()),
      meta: {
        total: productMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 3. Booking Unit Report
  async getBookingUnitReport(
    filters: ProductReportFilterDto,
  ): Promise<ReportResponse<BookingUnitReportRow>> {
    const where = this.buildOrderWhereClause(filters);

    const items = await this.prismaTenant.orderItem.findMany({
      where: {
        order: where,
        ...(filters.productName && {
          name: { contains: filters.productName, mode: 'insensitive' },
        }),
        ...(filters.sku && { sku: filters.sku }),
      },
      select: {
        name: true,
        sku: true,
        quantity: true,
        order: {
          select: {
            status: true,
            courerService: { select: { id: true, name: true, courier: true } },
          },
        },
      },
    });

    const productMap = new Map<string, BookingUnitReportRow>();

    for (const item of items) {
      const key = item.sku || item.name || 'Unknown';

      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: item.name || 'Unknown',
          sku: item.sku || '',
          confirmedUnits: 0,
          bookedUnits: 0,
          bookingErrorUnits: 0,
          deliveredByCourier: [],
        });
      }

      const prod = productMap.get(key)!;
      const qty = item.quantity || 0;
      const status = item.order.status?.toLowerCase();

      if (status === OrderStatus.confirmed) prod.confirmedUnits += qty;
      else if (status === OrderStatus.booked) prod.bookedUnits += qty;
      else if (status === OrderStatus.bookingError) prod.bookingErrorUnits += qty;
      else if (status === OrderStatus.delivered && item.order.courerService) {
        const courierKey = `${item.order.courerService.id}`;
        let courierEntry = prod.deliveredByCourier.find(
          (c) => c.courierServiceName === item.order.courerService!.name,
        );
        if (!courierEntry) {
          courierEntry = {
            courierServiceName: item.order.courerService.name,
            courierName: item.order.courerService.courier,
            units: 0,
          };
          prod.deliveredByCourier.push(courierEntry);
        }
        courierEntry.units += qty;
      }
    }

    return {
      data: Array.from(productMap.values()),
      meta: {
        total: productMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 4. FOC Unit Report
  async getFocUnitReport(
    filters: FocReportFilterDto,
  ): Promise<ReportResponse<FocUnitReportRow>> {
    const where = this.buildOrderWhereClause(filters);

    const items = await this.prismaTenant.orderItem.findMany({
      where: {
        order: where,
        unitPrice: 0,
      },
      select: {
        name: true,
        sku: true,
        quantity: true,
        order: {
          select: {
            status: true,
            courerService: { select: { name: true, courier: true } },
          },
        },
      },
    });

    const productMap = new Map<string, FocUnitReportRow>();

    for (const item of items) {
      const key = item.sku || item.name || 'Unknown';

      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: item.name || 'Unknown',
          sku: item.sku || '',
          totalFocUnits: 0,
          deliveredByCourier: [],
        });
      }

      const prod = productMap.get(key)!;
      const qty = item.quantity || 0;
      prod.totalFocUnits += qty;

      const status = item.order.status?.toLowerCase();
      if (status === OrderStatus.delivered && item.order.courerService) {
        let courierEntry = prod.deliveredByCourier.find(
          (c) => c.courierServiceName === item.order.courerService!.name,
        );
        if (!courierEntry) {
          courierEntry = {
            courierServiceName: item.order.courerService.name,
            courierName: item.order.courerService.courier,
            units: 0,
          };
          prod.deliveredByCourier.push(courierEntry);
        }
        courierEntry.units += qty;
      }
    }

    return {
      data: Array.from(productMap.values()),
      meta: {
        total: productMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 5. Agent Channel Report
  async getAgentChannelReport(
    filters: AgentReportFilterDto,
  ): Promise<ReportResponse<AgentChannelReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.userId = filters.userId ? filters.userId : { not: null };
    where.channelId = filters.channelId ? filters.channelId : { not: null };

    const orders = await this.prismaTenant.order.findMany({
      where,
      select: {
        id: true,
        userId: true,
        channelId: true,
        status: true,
        totalAmount: true,
        user: { select: { name: true } },
        channel: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    });

    const aggregateMap = new Map<string, AgentChannelReportRow>();

    for (const order of orders) {
      if (!order.channelId || !order.userId) continue;

      const key = `${order.channelId}-${order.userId}`;
      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          channelId: order.channelId,
          channelName: order.channel?.name || 'Unknown',
          userId: order.userId,
          userName: order.user?.name || 'Unknown',
          totalOrders: 0,
          duplicateOrders: 0,
          confirmedOrders: 0,
          totalCodAmount: 0,
          totalProductCount: 0,
          confirmedProductCount: 0,
          duplicateProductCount: 0,
        });
      }

      const agg = aggregateMap.get(key)!;
      agg.totalOrders += 1;

      const productCount = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      agg.totalProductCount += productCount;

      const status = order.status?.toLowerCase();
      if (status === OrderStatus.confirmed) {
        agg.confirmedOrders += 1;
        agg.confirmedProductCount += productCount;
        agg.totalCodAmount += order.totalAmount || 0;
      } else if (status === OrderStatus.duplicate) {
        agg.duplicateOrders += 1;
        agg.duplicateProductCount += productCount;
      }
    }

    return {
      data: Array.from(aggregateMap.values()),
      meta: {
        total: aggregateMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 6. Channel Order Report
  async getChannelOrderReport(
    filters: BaseReportFilterDto,
  ): Promise<ReportResponse<ChannelOrderReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.channelId = { not: null };

    const orders = await this.prismaTenant.order.findMany({
      where,
      select: {
        channelId: true,
        status: true,
        channel: { select: { name: true } },
        items: { select: { quantity: true } },
      },
    });

    const channelMap = new Map<number, ChannelOrderReportRow>();

    for (const order of orders) {
      if (!order.channelId) continue;

      if (!channelMap.has(order.channelId)) {
        channelMap.set(order.channelId, {
          channelId: order.channelId,
          channelName: order.channel?.name || 'Unknown',
          totalOrders: 0,
          confirmedOrders: 0,
          duplicateOrders: 0,
          cancelOrders: 0,
          noPickOrders: 0,
          totalProductCount: 0,
          confirmedProductCount: 0,
          duplicateProductCount: 0,
        });
      }

      const agg = channelMap.get(order.channelId)!;
      agg.totalOrders += 1;

      const productCount = order.items.reduce((sum, item) => sum + (item.quantity || 0), 0);
      agg.totalProductCount += productCount;

      const status = order.status?.toLowerCase();
      if (status === OrderStatus.confirmed) {
        agg.confirmedOrders += 1;
        agg.confirmedProductCount += productCount;
      } else if (status === OrderStatus.duplicate) {
        agg.duplicateOrders += 1;
        agg.duplicateProductCount += productCount;
      } else if (status === OrderStatus.cancel) {
        agg.cancelOrders += 1;
      } else if (status === OrderStatus.noPick) {
        agg.noPickOrders += 1;
      }
    }

    return {
      data: Array.from(channelMap.values()),
      meta: {
        total: channelMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 7. User Incentive Report
  async getUserIncentiveReport(
    filters: AgentReportFilterDto,
  ): Promise<ReportResponse<UserIncentiveReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.userId = filters.userId ? filters.userId : { not: null };
    where.status = { in: [OrderStatus.confirmed, OrderStatus.delivered] };

    const orders = await this.prismaTenant.order.findMany({
      where,
      select: {
        userId: true,
        status: true,
        user: { select: { name: true } },
        items: {
          select: {
            name: true,
            sku: true,
            quantity: true,
          },
        },
      },
    });

    // Get products with incentive field
    const skus = [...new Set(orders.flatMap((o) => o.items.map((i) => i.sku).filter(Boolean)))];
    const products = await this.prismaTenant.product.findMany({
      where: { sku: { in: skus as string[] } },
      select: { sku: true, incentive: true },
    });
    const incentiveMap = new Map(products.map((p) => [p.sku, p.incentive || 0]));

    const resultMap = new Map<string, UserIncentiveReportRow>();

    for (const order of orders) {
      if (!order.userId) continue;

      for (const item of order.items) {
        const key = `${order.userId}-${item.sku || item.name}`;
        const incentive = incentiveMap.get(item.sku || '') || 0;

        if (!resultMap.has(key)) {
          resultMap.set(key, {
            userId: order.userId,
            userName: order.user?.name || 'Unknown',
            productName: item.name || 'Unknown',
            sku: item.sku || '',
            confirmedCount: 0,
            deliveredCount: 0,
            incentivePerUnit: incentive,
            totalIncentive: 0,
          });
        }

        const row = resultMap.get(key)!;
        const qty = item.quantity || 0;

        if (order.status === OrderStatus.delivered) {
          row.deliveredCount += qty;
          row.confirmedCount += qty; // Delivered implies confirmed
        } else if (order.status === OrderStatus.confirmed) {
          row.confirmedCount += qty;
        }

        row.totalIncentive = row.deliveredCount * row.incentivePerUnit;
      }
    }

    return {
      data: Array.from(resultMap.values()),
      meta: {
        total: resultMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 8. Courier Delivery Report
  async getCourierDeliveryReport(
    filters: CourierReportFilterDto,
  ): Promise<ReportResponse<CourierDeliveryReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.courierServiceId = filters.courierServiceId
      ? filters.courierServiceId
      : { not: null };

    if (filters.courierName) {
      where.courierService = {
        courier: { contains: filters.courierName, mode: 'insensitive' },
      };
    }

    const grouped = await this.prismaTenant.order.groupBy({
      by: ['courierServiceId', 'status'],
      where,
      _count: { id: true },
    });

    const serviceIds = [
      ...new Set(grouped.map((g) => g.courierServiceId).filter(Boolean)),
    ] as number[];
    const services = await this.prismaTenant.courierService.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, courier: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const aggregated = new Map<number, CourierDeliveryReportRow>();

    for (const row of grouped) {
      if (!row.courierServiceId) continue;
      const service = serviceMap.get(row.courierServiceId);

      if (!aggregated.has(row.courierServiceId)) {
        aggregated.set(row.courierServiceId, {
          courierServiceId: row.courierServiceId,
          courierServiceName: service?.name || 'Unknown',
          courierName: service?.courier || 'Unknown',
          bookedCount: 0,
          deliveredCount: 0,
          inTransitCount: 0,
          returnedCount: 0,
          bookingErrorCount: 0,
          canceledCount: 0,
        });
      }

      const agg = aggregated.get(row.courierServiceId)!;
      const status = row.status?.toLowerCase();

      if (status === OrderStatus.booked) agg.bookedCount += row._count.id;
      else if (status === OrderStatus.delivered) agg.deliveredCount += row._count.id;
      else if (status === OrderStatus.inTransit) agg.inTransitCount += row._count.id;
      else if (status === OrderStatus.returned) agg.returnedCount += row._count.id;
      else if (status === OrderStatus.bookingError) agg.bookingErrorCount += row._count.id;
      else if (status === OrderStatus.bookingCanceled) agg.canceledCount += row._count.id;
    }

    return {
      data: Array.from(aggregated.values()),
      meta: {
        total: aggregated.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 9. Courier Dispatch Report
  async getCourierDispatchReport(
    filters: CourierReportFilterDto,
  ): Promise<ReportResponse<CourierDispatchReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.courierServiceId = filters.courierServiceId
      ? filters.courierServiceId
      : { not: null };
    where.status = OrderStatus.booked;

    if (filters.courierName) {
      where.courierService = {
        courier: { contains: filters.courierName, mode: 'insensitive' },
      };
    }

    const grouped = await this.prismaTenant.order.groupBy({
      by: ['courierServiceId'],
      where,
      _count: { id: true },
    });

    const serviceIds = [
      ...new Set(grouped.map((g) => g.courierServiceId).filter(Boolean)),
    ] as number[];
    const services = await this.prismaTenant.courierService.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, courier: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const result: CourierDispatchReportRow[] = grouped
      .filter((g) => g.courierServiceId)
      .map((g) => {
        const service = serviceMap.get(g.courierServiceId!);
        return {
          courierServiceId: g.courierServiceId!,
          courierServiceName: service?.name || 'Unknown',
          courierName: service?.courier || 'Unknown',
          totalBookedOrders: g._count.id,
        };
      });

    return {
      data: result,
      meta: {
        total: result.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 10. Channel Order Generation Report (from Shopify webhooks)
  async getChannelOrderGenerationReport(
    filters: WebhookReportFilterDto,
  ): Promise<ReportResponse<ChannelOrderGenerationReportRow>> {
    const where: any = {};

    if (filters.domain) {
      where.domain = { contains: filters.domain, mode: 'insensitive' };
    }
    if (filters.topic) {
      where.topic = filters.topic;
    }
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.receivedAt = {};
      if (filters.dateRange.start)
        where.receivedAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.receivedAt.lte = new Date(filters.dateRange.end);
    }

    const grouped = await this.prismaTenant.shopifyWebhookLog.groupBy({
      by: ['domain'],
      where,
      _count: { id: true },
      _sum: { itemQuantity: true, amount: true },
    });

    const result: ChannelOrderGenerationReportRow[] = grouped.map((row) => ({
      domain: row.domain,
      ordersCount: row._count.id,
      totalUnits: row._sum.itemQuantity || 0,
      totalAmount: row._sum.amount || 0,
    }));

    return {
      data: result,
      meta: {
        total: result.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 11. Booked Product Value Report
  async getBookedProductValueReport(
    filters: BookedProductValueFilterDto,
  ): Promise<ReportResponse<BookedProductValueReportRow>> {
    const where = this.buildOrderWhereClause(filters);
    where.status = {
      in: filters.bookedStatuses || [
        OrderStatus.booked,
        OrderStatus.dispatched,
        OrderStatus.inTransit,
        OrderStatus.delivered,
      ],
    };

    const items = await this.prismaTenant.orderItem.findMany({
      where: { order: where },
      select: {
        name: true,
        sku: true,
        unitPrice: true,
        quantity: true,
      },
    });

    const productMap = new Map<string, BookedProductValueReportRow>();

    for (const item of items) {
      const key = item.sku || item.name || 'Unknown';

      if (!productMap.has(key)) {
        productMap.set(key, {
          productName: item.name || 'Unknown',
          sku: item.sku || '',
          unitPrice: item.unitPrice || 0,
          quantity: 0,
          totalValue: 0,
        });
      }

      const prod = productMap.get(key)!;
      prod.quantity += item.quantity || 0;
      prod.totalValue += (item.unitPrice || 0) * (item.quantity || 0);
    }

    const sortedResults = Array.from(productMap.values()).sort(
      (a, b) => b.totalValue - a.totalValue,
    );

    return {
      data: sortedResults,
      meta: {
        total: productMap.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
