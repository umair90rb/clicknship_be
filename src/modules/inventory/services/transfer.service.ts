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
import { TransferStatus } from '../inventory.types';
import { CreateTransferDto } from '../dtos/inventory.dto';

@Injectable()
export class TransferService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private inventoryService: InventoryService,
  ) {}

  private select = {
    id: true,
    transferNumber: true,
    status: true,
    notes: true,
    initiatedAt: true,
    completedAt: true,
    fromLocation: {
      select: {
        id: true,
        name: true,
      },
    },
    toLocation: {
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
        quantity: true,
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
      },
    },
  };

  async list(status?: TransferStatus) {
    const where = status ? { status } : {};
    return this.prismaTenant.stockTransfer.findMany({
      where,
      select: this.select,
      orderBy: { initiatedAt: 'desc' },
    });
  }

  async get(id: number) {
    const transfer = await this.prismaTenant.stockTransfer.findFirst({
      where: { id },
      select: this.select,
    });
    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }
    return transfer;
  }

  async create(body: CreateTransferDto, userId: number) {
    if (body.fromLocationId === body.toLocationId) {
      throw new BadRequestException(
        'Source and destination locations must be different',
      );
    }

    // Verify locations exist
    const [fromLocation, toLocation] = await Promise.all([
      this.prismaTenant.inventoryLocation.findFirst({
        where: { id: body.fromLocationId },
      }),
      this.prismaTenant.inventoryLocation.findFirst({
        where: { id: body.toLocationId },
      }),
    ]);

    if (!fromLocation) {
      throw new NotFoundException('Source location not found');
    }
    if (!toLocation) {
      throw new NotFoundException('Destination location not found');
    }

    // Verify stock availability for all items at source location
    for (const item of body.items) {
      const stockLevel = await this.inventoryService.getStockLevel(
        item.variantId,
        body.fromLocationId,
      );
      if (!stockLevel || stockLevel.availableQuantity < item.quantity) {
        const available = stockLevel?.availableQuantity || 0;
        throw new BadRequestException(
          `Insufficient stock for variant ${item.variantId}. Available: ${available}, Requested: ${item.quantity}`,
        );
      }
    }

    const transferNumber = `TRF-${nanoid(8).toUpperCase()}`;

    const transfer = await this.prismaTenant.stockTransfer.create({
      data: {
        transferNumber,
        fromLocationId: body.fromLocationId,
        toLocationId: body.toLocationId,
        notes: body.notes,
        userId,
        items: {
          create: body.items.map((item) => ({
            variantId: item.variantId,
            quantity: item.quantity,
          })),
        },
      },
      select: this.select,
    });

    return transfer;
  }

  async markInTransit(id: number) {
    const transfer = await this.prismaTenant.stockTransfer.findFirst({
      where: { id },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException(
        'Only pending transfers can be marked as in transit',
      );
    }

    return this.prismaTenant.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.IN_TRANSIT },
      select: this.select,
    });
  }

  async complete(id: number, userId: number) {
    const transfer = await this.prismaTenant.stockTransfer.findFirst({
      where: { id },
      include: { items: true },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (
      transfer.status !== TransferStatus.PENDING &&
      transfer.status !== TransferStatus.IN_TRANSIT
    ) {
      throw new BadRequestException(
        'Only pending or in-transit transfers can be completed',
      );
    }

    // Process each item: deduct from source, add to destination
    for (const item of transfer.items) {
      // Deduct from source location
      await this.inventoryService.transferOut(
        item.variantId,
        item.quantity,
        transfer.fromLocationId,
        transfer.id,
        userId,
      );

      // Add to destination location
      await this.inventoryService.transferIn(
        item.variantId,
        item.quantity,
        transfer.toLocationId,
        transfer.id,
        userId,
      );
    }

    return this.prismaTenant.stockTransfer.update({
      where: { id },
      data: {
        status: TransferStatus.COMPLETED,
        completedAt: new Date(),
      },
      select: this.select,
    });
  }

  async cancel(id: number) {
    const transfer = await this.prismaTenant.stockTransfer.findFirst({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status === TransferStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel completed transfer');
    }

    if (transfer.status === TransferStatus.CANCELLED) {
      throw new BadRequestException('Transfer is already cancelled');
    }

    return this.prismaTenant.stockTransfer.update({
      where: { id },
      data: { status: TransferStatus.CANCELLED },
      select: this.select,
    });
  }

  async delete(id: number) {
    const transfer = await this.prismaTenant.stockTransfer.findFirst({
      where: { id },
    });

    if (!transfer) {
      throw new NotFoundException('Transfer not found');
    }

    if (transfer.status !== TransferStatus.PENDING) {
      throw new BadRequestException('Only pending transfers can be deleted');
    }

    // Delete items first
    await this.prismaTenant.stockTransferItem.deleteMany({
      where: { stockTransferId: id },
    });

    return this.prismaTenant.stockTransfer.delete({ where: { id } });
  }
}
