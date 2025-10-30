import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import {
  CreateProductDto,
  SearchProductDto,
  UpdateProductDto,
} from '../dto/product.dto';
import { NotFoundError } from 'rxjs';

@Injectable()
export class ProductService {
  private select = {
    brand: true,
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

  list() {}
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
