import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { MovementService } from './movement.service';
import { LocationService } from './location.service';
import {
  MovementType,
  ReferenceType,
  StockLevel,
  StockOperation,
} from '../inventory.types';
import {
  CreateInventoryItemDto,
  UpdateInventoryItemDto,
  StockQueryDto,
} from '../dtos/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private movementService: MovementService,
    private locationService: LocationService,
  ) {}

  private inventoryItemSelect = {
    id: true,
    quantity: true,
    reservedQuantity: true,
    reorderPoint: true,
    reorderQuantity: true,
    costPrice: true,
    updatedAt: true,
    variant: {
      select: {
        id: true,
        sku: true,
        unitPrice: true,
        costPrice: true,
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
  };

  // ============ Inventory Item CRUD ============

  async createInventoryItem(data: CreateInventoryItemDto) {
    // Check if variant exists
    const variant = await this.prismaTenant.productVariant.findFirst({
      where: { id: data.variantId },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    // Check for existing inventory item for this variant/location combo
    const existing = await this.prismaTenant.inventoryItem.findFirst({
      where: {
        variantId: data.variantId,
        locationId: data.locationId || null,
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Inventory item already exists for this variant/location',
      );
    }

    return this.prismaTenant.inventoryItem.create({
      data: {
        variantId: data.variantId,
        locationId: data.locationId,
        quantity: data.quantity || 0,
        reorderPoint: data.reorderPoint,
        reorderQuantity: data.reorderQuantity,
        costPrice: data.costPrice,
      },
      select: this.inventoryItemSelect,
    });
  }

  async updateInventoryItem(id: number, data: UpdateInventoryItemDto) {
    const item = await this.prismaTenant.inventoryItem.findFirst({
      where: { id },
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    return this.prismaTenant.inventoryItem.update({
      where: { id },
      data,
      select: this.inventoryItemSelect,
    });
  }

  async getInventoryItem(id: number) {
    const item = await this.prismaTenant.inventoryItem.findFirst({
      where: { id },
      select: this.inventoryItemSelect,
    });
    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }
    return item;
  }

  async listInventoryItems(query: StockQueryDto) {
    const where: any = {};

    if (query.locationId) {
      where.locationId = query.locationId;
    }
    if (query.variantId) {
      where.variantId = query.variantId;
    }

    const items = await this.prismaTenant.inventoryItem.findMany({
      where,
      select: this.inventoryItemSelect,
      orderBy: { variant: { product: { name: 'asc' } } },
    });

    let result = items.map((item) => ({
      ...item,
      availableQuantity: item.quantity - item.reservedQuantity,
    }));

    if (query.lowStockOnly) {
      result = result.filter(
        (item) =>
          item.reorderPoint && item.availableQuantity <= item.reorderPoint,
      );
    }

    return result;
  }

  // ============ Stock Operations ============

  async getStockLevel(
    variantId: number,
    locationId?: number,
  ): Promise<StockLevel | null> {
    const item = await this.prismaTenant.inventoryItem.findFirst({
      where: {
        variantId,
        locationId: locationId || null,
      },
      select: this.inventoryItemSelect,
    });

    if (!item) return null;

    return {
      variantId: item.variant.id,
      variantSku: item.variant.sku,
      productId: item.variant.product.id,
      productName: item.variant.product.name,
      locationId: item.location?.id,
      locationName: item.location?.name,
      quantity: item.quantity,
      reservedQuantity: item.reservedQuantity,
      availableQuantity: item.quantity - item.reservedQuantity,
      reorderPoint: item.reorderPoint,
      costPrice: item.costPrice,
    };
  }

  async getAvailableStock(variantId: number, locationId?: number) {
    const stockLevel = await this.getStockLevel(variantId, locationId);
    return stockLevel ? stockLevel.availableQuantity : 0;
  }

  /**
   * Reserve stock when order is CONFIRMED
   * Increments reservedQuantity, does not change quantity
   */
  async reserveStock(operation: StockOperation) {
    const { variantId, quantity, locationId, orderId, userId } = operation;

    const item = await this.getOrCreateInventoryItem(variantId, locationId);
    const availableStock = item.quantity - item.reservedQuantity;

    if (availableStock < quantity) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${availableStock}, Requested: ${quantity}`,
      );
    }

    const previousReserved = item.reservedQuantity;
    const newReserved = previousReserved + quantity;

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: { reservedQuantity: newReserved },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.RESERVATION,
      quantity: quantity,
      previousQuantity: previousReserved,
      newQuantity: newReserved,
      reason: `Stock reserved for order #${orderId}`,
      referenceType: ReferenceType.ORDER,
      referenceId: orderId,
      costAtTime: item.costPrice,
      userId,
    });

    return {
      ...updated,
      availableQuantity: updated.quantity - updated.reservedQuantity,
    };
  }

  /**
   * Release reservation when order is CANCELLED
   * Decrements reservedQuantity, does not change quantity
   */
  async releaseReservation(operation: StockOperation) {
    const { variantId, quantity, locationId, orderId, userId } = operation;

    const item = await this.prismaTenant.inventoryItem.findFirst({
      where: {
        variantId,
        locationId: locationId || null,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    if (item.reservedQuantity < quantity) {
      throw new BadRequestException(
        `Cannot release more than reserved. Reserved: ${item.reservedQuantity}, Requested: ${quantity}`,
      );
    }

    const previousReserved = item.reservedQuantity;
    const newReserved = previousReserved - quantity;

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: { reservedQuantity: newReserved },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.RESERVATION_RELEASE,
      quantity: -quantity,
      previousQuantity: previousReserved,
      newQuantity: newReserved,
      reason: `Reservation released for cancelled order #${orderId}`,
      referenceType: ReferenceType.ORDER,
      referenceId: orderId,
      costAtTime: item.costPrice,
      userId,
    });

    return {
      ...updated,
      availableQuantity: updated.quantity - updated.reservedQuantity,
    };
  }

  /**
   * Deduct stock when order is PACKED
   * Decrements both quantity and reservedQuantity
   */
  async deductStock(operation: StockOperation) {
    const { variantId, quantity, locationId, orderId, userId } = operation;

    const item = await this.prismaTenant.inventoryItem.findFirst({
      where: {
        variantId,
        locationId: locationId || null,
      },
    });

    if (!item) {
      throw new NotFoundException('Inventory item not found');
    }

    // Deduct from both quantity and reserved
    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity - quantity;

    // Also release the reservation
    const previousReserved = item.reservedQuantity;
    const newReserved = Math.max(0, previousReserved - quantity);

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Insufficient stock. Available: ${item.quantity}, Requested: ${quantity}`,
      );
    }

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: newQuantity,
        reservedQuantity: newReserved,
      },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.SALE,
      quantity: -quantity,
      previousQuantity,
      newQuantity,
      reason: `Stock deducted for packed order #${orderId}`,
      referenceType: ReferenceType.ORDER,
      referenceId: orderId,
      costAtTime: item.costPrice,
      userId,
    });

    return {
      ...updated,
      availableQuantity: updated.quantity - updated.reservedQuantity,
    };
  }

  /**
   * Restock when return is received and user chooses to restock
   * Increments quantity
   */
  async restockFromReturn(operation: StockOperation) {
    const { variantId, quantity, locationId, orderId, reason, userId } =
      operation;

    const item = await this.getOrCreateInventoryItem(variantId, locationId);

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantity;

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQuantity },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.RETURN,
      quantity: quantity,
      previousQuantity,
      newQuantity,
      reason: reason || `Stock returned from order #${orderId}`,
      referenceType: ReferenceType.ORDER,
      referenceId: orderId,
      costAtTime: item.costPrice,
      userId,
    });

    return {
      ...updated,
      availableQuantity: updated.quantity - updated.reservedQuantity,
    };
  }

  /**
   * Manual stock adjustment
   */
  async adjustStock(operation: StockOperation) {
    const { variantId, quantity, locationId, reason, userId } = operation;

    const item = await this.getOrCreateInventoryItem(variantId, locationId);

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantity;

    if (newQuantity < 0) {
      throw new BadRequestException(
        `Adjustment would result in negative stock. Current: ${item.quantity}, Adjustment: ${quantity}`,
      );
    }

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQuantity },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.ADJUSTMENT,
      quantity: quantity,
      previousQuantity,
      newQuantity,
      reason: reason || 'Manual adjustment',
      referenceType: ReferenceType.MANUAL,
      costAtTime: item.costPrice,
      userId,
    });

    return {
      ...updated,
      availableQuantity: updated.quantity - updated.reservedQuantity,
    };
  }

  /**
   * Add stock from purchase order
   */
  async addStockFromPurchase(
    variantId: number,
    quantity: number,
    locationId: number | undefined,
    purchaseOrderId: number,
    costPrice: number,
    userId?: number,
  ) {
    const item = await this.getOrCreateInventoryItem(variantId, locationId);

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantity;

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: newQuantity,
        costPrice: costPrice, // Update cost price from PO
      },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.PURCHASE,
      quantity: quantity,
      previousQuantity,
      newQuantity,
      reason: `Stock received from PO #${purchaseOrderId}`,
      referenceType: ReferenceType.PURCHASE_ORDER,
      referenceId: purchaseOrderId,
      costAtTime: costPrice,
      userId,
    });

    return {
      ...updated,
      availableQuantity: updated.quantity - updated.reservedQuantity,
    };
  }

  /**
   * Transfer stock out from a location
   */
  async transferOut(
    variantId: number,
    quantity: number,
    locationId: number,
    transferId: number,
    userId?: number,
  ) {
    const item = await this.prismaTenant.inventoryItem.findFirst({
      where: { variantId, locationId },
    });

    if (!item) {
      throw new NotFoundException(
        'Inventory item not found at source location',
      );
    }

    const availableStock = item.quantity - item.reservedQuantity;
    if (availableStock < quantity) {
      throw new BadRequestException(
        `Insufficient available stock at source. Available: ${availableStock}, Requested: ${quantity}`,
      );
    }

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity - quantity;

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQuantity },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.TRANSFER_OUT,
      quantity: -quantity,
      previousQuantity,
      newQuantity,
      reason: `Transfer out to another location`,
      referenceType: ReferenceType.TRANSFER,
      referenceId: transferId,
      costAtTime: item.costPrice,
      userId,
    });

    return updated;
  }

  /**
   * Transfer stock in to a location
   */
  async transferIn(
    variantId: number,
    quantity: number,
    locationId: number,
    transferId: number,
    userId?: number,
  ) {
    const item = await this.getOrCreateInventoryItem(variantId, locationId);

    const previousQuantity = item.quantity;
    const newQuantity = previousQuantity + quantity;

    const updated = await this.prismaTenant.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newQuantity },
      select: this.inventoryItemSelect,
    });

    await this.movementService.create({
      inventoryItemId: item.id,
      type: MovementType.TRANSFER_IN,
      quantity: quantity,
      previousQuantity,
      newQuantity,
      reason: `Transfer in from another location`,
      referenceType: ReferenceType.TRANSFER,
      referenceId: transferId,
      costAtTime: item.costPrice,
      userId,
    });

    return updated;
  }

  // ============ Low Stock ============

  async getLowStockItems(locationId?: number) {
    const where: any = {
      reorderPoint: { not: null },
    };

    if (locationId) {
      where.locationId = locationId;
    }

    const items = await this.prismaTenant.inventoryItem.findMany({
      where,
      select: this.inventoryItemSelect,
    });

    return items
      .filter((item) => {
        const available = item.quantity - item.reservedQuantity;
        return item.reorderPoint && available <= item.reorderPoint;
      })
      .map((item) => ({
        ...item,
        availableQuantity: item.quantity - item.reservedQuantity,
      }));
  }

  // ============ Helpers ============

  private async getOrCreateInventoryItem(
    variantId: number,
    locationId?: number,
  ) {
    let item = await this.prismaTenant.inventoryItem.findFirst({
      where: {
        variantId,
        locationId: locationId || null,
      },
    });

    if (!item) {
      // Auto-create inventory item
      item = await this.prismaTenant.inventoryItem.create({
        data: {
          variantId,
          locationId: locationId || null,
          quantity: 0,
          reservedQuantity: 0,
        },
      });
    }

    return item;
  }
}
