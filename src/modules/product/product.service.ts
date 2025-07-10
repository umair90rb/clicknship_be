import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProductService {
  constructor(@Inject('TENANT_CONNECTION') private prisma: PrismaClient) {}
  getAllProducts() {
    return this.prisma.product.findMany();
  }
}
