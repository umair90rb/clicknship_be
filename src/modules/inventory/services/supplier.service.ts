import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { CreateSupplierDto, UpdateSupplierDto } from '../dtos/inventory.dto';

@Injectable()
export class SupplierService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    name: true,
    contactName: true,
    email: true,
    phone: true,
    address: true,
    active: true,
  };

  async list() {
    return this.prismaTenant.supplier.findMany({
      where: { active: true },
      select: {
        ...this.select,
        _count: { select: { purchaseOrders: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async get(id: number) {
    const supplier = await this.prismaTenant.supplier.findFirst({
      where: { id },
      select: this.select,
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    return supplier;
  }

  async create(body: CreateSupplierDto) {
    const existing = await this.prismaTenant.supplier.findFirst({
      where: { name: body.name },
    });
    if (existing) {
      throw new BadRequestException('Supplier with this name already exists');
    }

    return this.prismaTenant.supplier.create({
      data: body,
      select: this.select,
    });
  }

  async update(id: number, body: UpdateSupplierDto) {
    const supplier = await this.prismaTenant.supplier.findFirst({
      where: { id },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    return this.prismaTenant.supplier.update({
      where: { id },
      data: body,
      select: this.select,
    });
  }

  async delete(id: number) {
    const supplier = await this.prismaTenant.supplier.findFirst({
      where: { id },
      include: { _count: { select: { purchaseOrders: true } } },
    });
    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }
    if (supplier._count.purchaseOrders > 0) {
      throw new BadRequestException(
        'Cannot delete supplier with purchase orders. Deactivate instead.',
      );
    }
    return this.prismaTenant.supplier.delete({ where: { id } });
  }
}
