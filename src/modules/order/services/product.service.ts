import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import {
  CreateProductDto,
  ListProductBodyDto,
  SearchProductDto,
  UpdateProductDto,
} from '../dto/product.dto';
import { NotFoundError } from 'rxjs';

@Injectable()
export class ProductService {
  private select = {
    id: true,
    name: true,
    description: true,
    sku: true,
    barcode: true,
    unitPrice: true,
    costPrice: true,
    incentive: true,
    weight: true,
    brand: { select: { id: true, name: true } },
    unit: { select: { id: true, name: true } },
    category: {
      select: {
        id: true,
        name: true,
      },
    },
  };
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: ListProductBodyDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.unitPrice) {
      const { min, max } = filters.unitPrice;
      where.unitPrice = {};
      if (min !== undefined && min !== null && min !== '') {
        where.unitPrice.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.unitPrice.lte = Number(max);
      }
    }
    if (filters.costPrice) {
      const { min, max } = filters.costPrice;
      where.costPrice = {};
      if (min !== undefined && min !== null && min !== '') {
        where.costPrice.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.costPrice.lte = Number(max);
      }
    }

    if (filters.weight) {
      const { min, max } = filters.weight;
      where.weight = {};
      if (min !== undefined && min !== null && min !== '') {
        where.weight.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.weight.lte = Number(max);
      }
    }

    if (filters.incentive) {
      const { min, max } = filters.incentive;
      where.incentive = {};
      if (min !== undefined && min !== null && min !== '') {
        where.incentive.gte = Number(min);
      }
      if (max !== undefined && max !== null && max !== '') {
        where.incentive.lte = Number(max);
      }
    }

    const [products, total] = await Promise.all([
      this.prismaTenant.product.findMany({
        where,
        skip,
        take,
        orderBy: { name: 'asc' },
        select: this.select,
      }),
      this.prismaTenant.product.count({ where }),
    ]);

    return {
      data: products,
      meta: { total, skip, take, ...filters },
    };
  }
  get(id: number) {
    return this.prismaTenant.product.findFirst({
      where: { id },
      relationLoadStrategy: 'join',
      select: this.select,
    });
  }

  async find(body: SearchProductDto) {
    return this.prismaTenant.product.findFirst({
      where: body,
      relationLoadStrategy: 'join',
      select: this.select,
    });
  }

  create(user: RequestUser, body: CreateProductDto) {
    const { unitId, brandId, categoryId, ...product } = body;
    return this.prismaTenant.product.create({
      select: this.select,
      data: {
        ...product,
        ...(unitId ? { unit: { connect: { id: unitId } } } : {}),
        ...(brandId ? { unit: { connect: { id: brandId } } } : {}),
        ...(categoryId ? { unit: { connect: { id: categoryId } } } : {}),
      },
    });
  }
  update(user: RequestUser, id: number, body: UpdateProductDto) {
    const { unitId, brandId, categoryId, ...product } = body;
    return this.prismaTenant.product.update({
      where: { id },
      select: this.select,
      data: {
        ...product,
        ...(unitId ? { unit: { connect: { id: unitId } } } : {}),
        ...(brandId ? { unit: { connect: { id: brandId } } } : {}),
        ...(categoryId ? { unit: { connect: { id: categoryId } } } : {}),
      },
    });
  }
  async delete(user: RequestUser, id: number) {
    const product = await this.prismaTenant.product.findFirst({
      where: { id },
    });
    if (!product) {
      throw new NotFoundError('Product no found');
    }
    return await this.prismaTenant.product.delete({ where: { id } });
  }
}
