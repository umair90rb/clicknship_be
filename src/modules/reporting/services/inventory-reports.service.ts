import { Inject, Injectable } from '@nestjs/common';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import {
  InventoryReportFilterDto,
  StockMovementReportFilterDto,
  PurchaseOrderReportFilterDto,
  LowStockReportFilterDto,
} from '../dto/inventory-report-filters.dto';
import {
  ReportResponse,
  StockReportRow,
  StockDamagedReportRow,
  StockExpiredReportRow,
  StockMovementReportRow,
  LowStockReportRow,
  PurchaseOrderReportRow,
} from '../types/report.types';

@Injectable()
export class InventoryReportsService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private buildInventoryItemWhereClause(
    filters: InventoryReportFilterDto,
  ): any {
    const where: any = {};

    if (filters.locationId) where.locationId = filters.locationId;
    if (filters.variantId) where.variantId = filters.variantId;
    if (filters.brandId)
      where.variant = { product: { brandId: filters.brandId } };
    if (filters.categoryId) {
      where.variant = {
        ...where.variant,
        product: {
          ...where.variant?.product,
          categoryId: filters.categoryId,
        },
      };
    }
    if (filters.sku) {
      where.variant = { ...where.variant, sku: filters.sku };
    }
    if (filters.productName) {
      where.variant = {
        ...where.variant,
        product: {
          ...where.variant?.product,
          name: { contains: filters.productName, mode: 'insensitive' },
        },
      };
    }

    return where;
  }

  // 1. Stock Report
  async getStockReport(
    filters: InventoryReportFilterDto,
  ): Promise<ReportResponse<StockReportRow>> {
    const where = this.buildInventoryItemWhereClause(filters);

    const items = await this.prismaTenant.inventoryItem.findMany({
      where,
      select: {
        id: true,
        quantity: true,
        reservedQuantity: true,
        reorderPoint: true,
        costPrice: true,
        variant: {
          select: {
            id: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        location: { select: { id: true, name: true } },
      },
      orderBy: { variant: { product: { name: 'asc' } } },
    });

    const result: StockReportRow[] = items.map((item) => ({
      variantId: item.variant.id,
      productId: item.variant.product.id,
      productName: item.variant.product.name,
      sku: item.variant.sku,
      locationId: item.location?.id || null,
      locationName: item.location?.name || null,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: item.quantity - item.reservedQuantity,
      reorderPoint: item.reorderPoint,
      costPrice: item.costPrice,
      stockValue: (item.costPrice || 0) * item.quantity,
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

  // 2. Stock Damaged Report
  async getStockDamagedReport(
    filters: StockMovementReportFilterDto,
  ): Promise<ReportResponse<StockDamagedReportRow>> {
    const where: any = { type: 'DAMAGED' };

    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.createdAt = {};
      if (filters.dateRange.start)
        where.createdAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.createdAt.lte = new Date(filters.dateRange.end);
    }
    if (filters.locationId)
      where.inventoryItem = { locationId: filters.locationId };
    if (filters.variantId) {
      where.inventoryItem = {
        ...where.inventoryItem,
        variantId: filters.variantId,
      };
    }
    if (filters.userId) where.userId = filters.userId;

    const movements = await this.prismaTenant.inventoryMovement.findMany({
      where,
      select: {
        id: true,
        quantity: true,
        reason: true,
        costAtTime: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        inventoryItem: {
          select: {
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { id: true, name: true } },
              },
            },
            location: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Aggregate by variant/location
    const aggregateMap = new Map<string, StockDamagedReportRow>();

    for (const m of movements) {
      const variant = m.inventoryItem.variant;
      const location = m.inventoryItem.location;
      const key = `${variant.id}-${location?.id || 'null'}`;

      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          sku: variant.sku,
          locationId: location?.id || null,
          locationName: location?.name || null,
          totalDamagedQuantity: 0,
          totalDamagedValue: 0,
          movements: [],
        });
      }

      const agg = aggregateMap.get(key)!;
      const qty = Math.abs(m.quantity);
      agg.totalDamagedQuantity += qty;
      agg.totalDamagedValue += (m.costAtTime || 0) * qty;
      agg.movements.push({
        date: m.createdAt.toISOString(),
        quantity: qty,
        reason: m.reason,
        userId: m.user?.id || null,
        userName: m.user?.name || null,
      });
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

  // 3. Stock Expired Report
  async getStockExpiredReport(
    filters: StockMovementReportFilterDto,
  ): Promise<ReportResponse<StockExpiredReportRow>> {
    const where: any = { type: 'EXPIRED' };

    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.createdAt = {};
      if (filters.dateRange.start)
        where.createdAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.createdAt.lte = new Date(filters.dateRange.end);
    }
    if (filters.locationId)
      where.inventoryItem = { locationId: filters.locationId };
    if (filters.variantId) {
      where.inventoryItem = {
        ...where.inventoryItem,
        variantId: filters.variantId,
      };
    }
    if (filters.userId) where.userId = filters.userId;

    const movements = await this.prismaTenant.inventoryMovement.findMany({
      where,
      select: {
        id: true,
        quantity: true,
        reason: true,
        costAtTime: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        inventoryItem: {
          select: {
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { id: true, name: true } },
              },
            },
            location: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const aggregateMap = new Map<string, StockExpiredReportRow>();

    for (const m of movements) {
      const variant = m.inventoryItem.variant;
      const location = m.inventoryItem.location;
      const key = `${variant.id}-${location?.id || 'null'}`;

      if (!aggregateMap.has(key)) {
        aggregateMap.set(key, {
          variantId: variant.id,
          productId: variant.product.id,
          productName: variant.product.name,
          sku: variant.sku,
          locationId: location?.id || null,
          locationName: location?.name || null,
          totalExpiredQuantity: 0,
          totalExpiredValue: 0,
          movements: [],
        });
      }

      const agg = aggregateMap.get(key)!;
      const qty = Math.abs(m.quantity);
      agg.totalExpiredQuantity += qty;
      agg.totalExpiredValue += (m.costAtTime || 0) * qty;
      agg.movements.push({
        date: m.createdAt.toISOString(),
        quantity: qty,
        reason: m.reason,
        userId: m.user?.id || null,
        userName: m.user?.name || null,
      });
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

  // 4. Stock Movement Report
  async getStockMovementReport(
    filters: StockMovementReportFilterDto,
  ): Promise<ReportResponse<StockMovementReportRow>> {
    const where: any = {};

    if (filters.movementTypes?.length)
      where.type = { in: filters.movementTypes };
    if (filters.userId) where.userId = filters.userId;
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.createdAt = {};
      if (filters.dateRange.start)
        where.createdAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.createdAt.lte = new Date(filters.dateRange.end);
    }
    if (filters.locationId)
      where.inventoryItem = { locationId: filters.locationId };
    if (filters.variantId) {
      where.inventoryItem = {
        ...where.inventoryItem,
        variantId: filters.variantId,
      };
    }
    if (filters.sku) {
      where.inventoryItem = {
        ...where.inventoryItem,
        variant: { sku: filters.sku },
      };
    }
    if (filters.productName) {
      where.inventoryItem = {
        ...where.inventoryItem,
        variant: {
          ...where.inventoryItem?.variant,
          product: {
            name: { contains: filters.productName, mode: 'insensitive' },
          },
        },
      };
    }

    const movements = await this.prismaTenant.inventoryMovement.findMany({
      where,
      select: {
        id: true,
        type: true,
        quantity: true,
        previousQuantity: true,
        newQuantity: true,
        reason: true,
        referenceType: true,
        referenceId: true,
        costAtTime: true,
        createdAt: true,
        user: { select: { id: true, name: true } },
        inventoryItem: {
          select: {
            variant: {
              select: {
                id: true,
                sku: true,
                product: { select: { id: true, name: true } },
              },
            },
            location: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: StockMovementReportRow[] = movements.map((m) => ({
      movementId: m.id,
      date: m.createdAt.toISOString(),
      variantId: m.inventoryItem.variant.id,
      productId: m.inventoryItem.variant.product.id,
      productName: m.inventoryItem.variant.product.name,
      sku: m.inventoryItem.variant.sku,
      locationId: m.inventoryItem.location?.id || null,
      locationName: m.inventoryItem.location?.name || null,
      type: m.type,
      quantity: m.quantity,
      previousQuantity: m.previousQuantity,
      newQuantity: m.newQuantity,
      reason: m.reason,
      referenceType: m.referenceType,
      referenceId: m.referenceId,
      costAtTime: m.costAtTime,
      userId: m.user?.id || null,
      userName: m.user?.name || null,
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

  // 5. Low Stock Report
  async getLowStockReport(
    filters: LowStockReportFilterDto,
  ): Promise<ReportResponse<LowStockReportRow>> {
    const where = this.buildInventoryItemWhereClause(filters);
    where.reorderPoint = { not: null };

    const items = await this.prismaTenant.inventoryItem.findMany({
      where,
      select: {
        quantity: true,
        reservedQuantity: true,
        reorderPoint: true,
        reorderQuantity: true,
        variant: {
          select: {
            id: true,
            sku: true,
            product: { select: { id: true, name: true } },
          },
        },
        location: { select: { id: true, name: true } },
      },
    });

    const lowStock = items
      .filter((item) => {
        const available = item.quantity - item.reservedQuantity;
        const isLow =
          item.reorderPoint !== null && available <= item.reorderPoint;
        const includeZero = filters.includeZeroStock || item.quantity > 0;
        return isLow && includeZero;
      })
      .map((item) => ({
        variantId: item.variant.id,
        productId: item.variant.product.id,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        locationId: item.location?.id || null,
        locationName: item.location?.name || null,
        currentQuantity: item.quantity,
        reservedQuantity: item.reservedQuantity,
        availableQuantity: item.quantity - item.reservedQuantity,
        reorderPoint: item.reorderPoint!,
        reorderQuantity: item.reorderQuantity,
        suggestedOrderQuantity: item.reorderQuantity || item.reorderPoint! * 2,
      }));

    return {
      data: lowStock,
      meta: {
        total: lowStock.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 6. Purchase Order Report
  async getPurchaseOrderReport(
    filters: PurchaseOrderReportFilterDto,
  ): Promise<ReportResponse<PurchaseOrderReportRow>> {
    const where: any = {};

    if (filters.statuses?.length) where.status = { in: filters.statuses };
    if (filters.supplierId) where.supplierId = filters.supplierId;
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.createdAt = {};
      if (filters.dateRange.start)
        where.createdAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.createdAt.lte = new Date(filters.dateRange.end);
    }

    const pos = await this.prismaTenant.purchaseOrder.findMany({
      where,
      select: {
        id: true,
        poNumber: true,
        status: true,
        orderDate: true,
        expectedDate: true,
        receivedDate: true,
        totalAmount: true,
        supplier: { select: { id: true, name: true } },
        items: { select: { orderedQuantity: true, receivedQuantity: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const result: PurchaseOrderReportRow[] = pos.map((po) => ({
      purchaseOrderId: po.id,
      poNumber: po.poNumber,
      status: po.status,
      supplierId: po.supplier?.id || null,
      supplierName: po.supplier?.name || null,
      orderDate: po.orderDate?.toISOString() || null,
      expectedDate: po.expectedDate?.toISOString() || null,
      receivedDate: po.receivedDate?.toISOString() || null,
      totalAmount: po.totalAmount || 0,
      itemCount: po.items.length,
      receivedItemCount: po.items.filter(
        (i) => i.receivedQuantity >= i.orderedQuantity,
      ).length,
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
}
