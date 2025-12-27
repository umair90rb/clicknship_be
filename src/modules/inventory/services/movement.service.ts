import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { MovementType, ReferenceType } from '../inventory.types';
import { MovementQueryDto } from '../dtos/inventory.dto';

export interface CreateMovementData {
  inventoryItemId: number;
  type: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason?: string;
  referenceType?: ReferenceType;
  referenceId?: number;
  costAtTime?: number;
  userId?: number;
}

@Injectable()
export class MovementService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
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
    inventoryItem: {
      select: {
        id: true,
        variant: {
          select: {
            id: true,
            sku: true,
            product: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        location: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    },
    user: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  async create(data: CreateMovementData) {
    return this.prismaTenant.inventoryMovement.create({
      data: {
        type: data.type,
        quantity: data.quantity,
        previousQuantity: data.previousQuantity,
        newQuantity: data.newQuantity,
        reason: data.reason,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        costAtTime: data.costAtTime,
        inventoryItemId: data.inventoryItemId,
        userId: data.userId,
      },
      select: this.select,
    });
  }

  async list(query: MovementQueryDto) {
    const where: any = {};

    if (query.variantId) {
      where.inventoryItem = { variantId: query.variantId };
    }

    if (query.orderId) {
      where.referenceType = ReferenceType.ORDER;
      where.referenceId = query.orderId;
    }

    if (query.fromDate || query.toDate) {
      where.createdAt = {};
      if (query.fromDate) {
        where.createdAt.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.createdAt.lte = new Date(query.toDate);
      }
    }

    const [items, total] = await Promise.all([
      this.prismaTenant.inventoryMovement.findMany({
        where,
        select: this.select,
        orderBy: { createdAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prismaTenant.inventoryMovement.count({ where }),
    ]);

    return { items, total };
  }

  async getByInventoryItem(inventoryItemId: number, limit = 50) {
    return this.prismaTenant.inventoryMovement.findMany({
      where: { inventoryItemId },
      select: this.select,
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  async getByOrder(orderId: number) {
    return this.prismaTenant.inventoryMovement.findMany({
      where: {
        referenceType: ReferenceType.ORDER,
        referenceId: orderId,
      },
      select: this.select,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByPurchaseOrder(purchaseOrderId: number) {
    return this.prismaTenant.inventoryMovement.findMany({
      where: {
        referenceType: ReferenceType.PURCHASE_ORDER,
        referenceId: purchaseOrderId,
      },
      select: this.select,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getByTransfer(transferId: number) {
    return this.prismaTenant.inventoryMovement.findMany({
      where: {
        referenceType: ReferenceType.TRANSFER,
        referenceId: transferId,
      },
      select: this.select,
      orderBy: { createdAt: 'desc' },
    });
  }
}
