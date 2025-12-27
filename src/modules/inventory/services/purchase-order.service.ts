import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { nanoid } from 'nanoid';
import { InventoryService } from './inventory.service';
import { PurchaseOrderStatus } from '../inventory.types';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from '../dtos/inventory.dto';

@Injectable()
export class PurchaseOrderService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private inventoryService: InventoryService,
  ) {}

  private select = {
    id: true,
    poNumber: true,
    status: true,
    orderDate: true,
    expectedDate: true,
    receivedDate: true,
    totalAmount: true,
    notes: true,
    createdAt: true,
    updatedAt: true,
    supplier: {
      select: {
        id: true,
        name: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
      },
    },
    items: {
      select: {
        id: true,
        orderedQuantity: true,
        receivedQuantity: true,
        unitCost: true,
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
  };

  async list(status?: PurchaseOrderStatus) {
    const where = status ? { status } : {};
    return this.prismaTenant.purchaseOrder.findMany({
      where,
      select: this.select,
      orderBy: { createdAt: 'desc' },
    });
  }

  async get(id: number) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
      select: this.select,
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }
    return po;
  }

  async create(body: CreatePurchaseOrderDto, userId: number) {
    const poNumber = `PO-${nanoid(8).toUpperCase()}`;

    // Calculate total amount
    const totalAmount = body.items.reduce(
      (sum, item) => sum + item.orderedQuantity * item.unitCost,
      0,
    );

    const po = await this.prismaTenant.purchaseOrder.create({
      data: {
        poNumber,
        supplierId: body.supplierId,
        orderDate: body.orderDate ? new Date(body.orderDate) : null,
        expectedDate: body.expectedDate ? new Date(body.expectedDate) : null,
        notes: body.notes,
        totalAmount,
        userId,
        items: {
          create: body.items.map((item) => ({
            variantId: item.variantId,
            orderedQuantity: item.orderedQuantity,
            unitCost: item.unitCost,
            locationId: item.locationId,
          })),
        },
      },
      select: this.select,
    });

    return po;
  }

  async update(id: number, body: UpdatePurchaseOrderDto) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      po.status !== PurchaseOrderStatus.DRAFT &&
      po.status !== PurchaseOrderStatus.ORDERED
    ) {
      throw new BadRequestException(
        'Cannot update purchase order in current status',
      );
    }

    return this.prismaTenant.purchaseOrder.update({
      where: { id },
      data: {
        supplierId: body.supplierId,
        orderDate: body.orderDate ? new Date(body.orderDate) : undefined,
        expectedDate: body.expectedDate
          ? new Date(body.expectedDate)
          : undefined,
        notes: body.notes,
        status: body.status,
      },
      select: this.select,
    });
  }

  async markAsOrdered(id: number) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
    });
    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft orders can be marked as ordered',
      );
    }

    return this.prismaTenant.purchaseOrder.update({
      where: { id },
      data: {
        status: PurchaseOrderStatus.ORDERED,
        orderDate: po.orderDate || new Date(),
      },
      select: this.select,
    });
  }

  async receive(id: number, body: ReceivePurchaseOrderDto, userId: number) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
      include: { items: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (
      po.status === PurchaseOrderStatus.CANCELLED ||
      po.status === PurchaseOrderStatus.RECEIVED
    ) {
      throw new BadRequestException(
        'Cannot receive items for cancelled or fully received PO',
      );
    }

    // Process each received item
    for (const receivedItem of body.items) {
      const poItem = po.items.find(
        (item) => item.id === receivedItem.purchaseOrderItemId,
      );
      if (!poItem) {
        throw new BadRequestException(
          `PO item not found: ${receivedItem.purchaseOrderItemId}`,
        );
      }

      const remainingToReceive =
        poItem.orderedQuantity - poItem.receivedQuantity;
      if (receivedItem.receivedQuantity > remainingToReceive) {
        throw new BadRequestException(
          `Cannot receive more than ordered. Remaining: ${remainingToReceive}`,
        );
      }

      // Update PO item received quantity
      await this.prismaTenant.purchaseOrderItem.update({
        where: { id: poItem.id },
        data: {
          receivedQuantity:
            poItem.receivedQuantity + receivedItem.receivedQuantity,
        },
      });

      // Add stock
      await this.inventoryService.addStockFromPurchase(
        poItem.variantId,
        receivedItem.receivedQuantity,
        poItem.locationId,
        po.id,
        poItem.unitCost,
        userId,
      );
    }

    // Check if fully received or partial
    const updatedPo = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
      include: { items: true },
    });

    const allReceived = updatedPo.items.every(
      (item) => item.receivedQuantity >= item.orderedQuantity,
    );
    const someReceived = updatedPo.items.some(
      (item) => item.receivedQuantity > 0,
    );

    let newStatus = po.status;
    if (allReceived) {
      newStatus = PurchaseOrderStatus.RECEIVED;
    } else if (someReceived) {
      newStatus = PurchaseOrderStatus.PARTIAL;
    }

    return this.prismaTenant.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        receivedDate: allReceived ? new Date() : undefined,
      },
      select: this.select,
    });
  }

  async cancel(id: number) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
      include: { items: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    // Check if any items have been received
    const hasReceivedItems = po.items.some((item) => item.receivedQuantity > 0);
    if (hasReceivedItems) {
      throw new BadRequestException(
        'Cannot cancel PO with received items. Items already added to inventory.',
      );
    }

    return this.prismaTenant.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      select: this.select,
    });
  }

  async delete(id: number) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id },
      include: { items: true },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only draft orders can be deleted');
    }

    // Delete items first (cascade should handle this but being explicit)
    await this.prismaTenant.purchaseOrderItem.deleteMany({
      where: { purchaseOrderId: id },
    });

    return this.prismaTenant.purchaseOrder.delete({ where: { id } });
  }
}
