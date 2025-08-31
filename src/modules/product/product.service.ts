import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class ProductService {
  constructor(
    @Inject('TENANT_CONNECTION') private prismaTenant: PrismaTenantClient,
  ) {}
  getAllProducts() {
    return this.prismaTenant.product.findMany();
  }
}
