import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import {
  CreateProductDto,
  SearchProductDto,
  UpdateProductDto,
} from '../dto/product.dto';

@Injectable()
export class ProductService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  list() {}
  get(id: number) {}

  async find(body: SearchProductDto) {
    return this.prismaTenant.product.findFirst({
      where: body,
      relationLoadStrategy: 'join',
      select: {
        brand: true,
        unit: { select: { id: true, name: true } },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  create(user: RequestUser, body: CreateProductDto) {}
  update(user: RequestUser, id: number, body: UpdateProductDto) {}
  delete(user: RequestUser, id: number) {}
}
