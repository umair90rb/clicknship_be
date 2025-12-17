import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { CreateLocationDto, UpdateLocationDto } from '../dtos/inventory.dto';

@Injectable()
export class LocationService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    name: true,
    address: true,
    isDefault: true,
    active: true,
  };

  async list() {
    return this.prismaTenant.inventoryLocation.findMany({
      where: { active: true },
      select: {
        ...this.select,
        _count: { select: { inventoryItems: true } },
      },
      orderBy: { isDefault: 'desc' },
    });
  }

  async get(id: number) {
    const location = await this.prismaTenant.inventoryLocation.findFirst({
      where: { id },
      select: this.select,
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    return location;
  }

  async create(body: CreateLocationDto) {
    const existing = await this.prismaTenant.inventoryLocation.findFirst({
      where: { name: body.name },
    });
    if (existing) {
      throw new BadRequestException('Location with this name already exists');
    }

    // If this is set as default, unset other defaults
    if (body.isDefault) {
      await this.prismaTenant.inventoryLocation.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    return this.prismaTenant.inventoryLocation.create({
      data: body,
      select: this.select,
    });
  }

  async update(id: number, body: UpdateLocationDto) {
    const location = await this.prismaTenant.inventoryLocation.findFirst({
      where: { id },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    // If setting as default, unset other defaults
    if (body.isDefault) {
      await this.prismaTenant.inventoryLocation.updateMany({
        where: { isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prismaTenant.inventoryLocation.update({
      where: { id },
      data: body,
      select: this.select,
    });
  }

  async delete(id: number) {
    const location = await this.prismaTenant.inventoryLocation.findFirst({
      where: { id },
      include: { _count: { select: { inventoryItems: true } } },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }
    if (location._count.inventoryItems > 0) {
      throw new BadRequestException(
        'Cannot delete location with inventory items',
      );
    }
    return this.prismaTenant.inventoryLocation.delete({ where: { id } });
  }

  async getDefaultLocation() {
    return this.prismaTenant.inventoryLocation.findFirst({
      where: { isDefault: true, active: true },
      select: this.select,
    });
  }

  async setDefaultLocation(id: number) {
    const location = await this.prismaTenant.inventoryLocation.findFirst({
      where: { id },
    });
    if (!location) {
      throw new NotFoundException('Location not found');
    }

    await this.prismaTenant.inventoryLocation.updateMany({
      where: { isDefault: true },
      data: { isDefault: false },
    });

    return this.prismaTenant.inventoryLocation.update({
      where: { id },
      data: { isDefault: true },
      select: this.select,
    });
  }
}
