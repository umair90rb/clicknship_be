import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { CreateBrandDto, UpdateBrandDto } from '../dto/brand.dto';

@Injectable()
export class BrandService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    name: true,
    active: true,
  };

  list() {
    return this.prismaTenant.brand.findMany({
      select: { ...this.select, _count: { select: { products: true } } },
    });
  }
  get(id: number) {
    return this.prismaTenant.brand.findFirst({ where: { id } });
  }
  async create(user: RequestUser, body: CreateBrandDto) {
    const exited = await this.prismaTenant.brand.findFirst({
      where: { name: body.name },
    });
    if (exited) {
      throw new BadRequestException('Brand with this name already existed');
    }
    return this.prismaTenant.brand.create({
      data: body,
      select: { ...this.select, _count: { select: { products: true } } },
    });
  }
  update(user: RequestUser, id: number, body: UpdateBrandDto) {
    return this.prismaTenant.brand.update({
      where: { id },
      data: body,
      select: { ...this.select, _count: { select: { products: true } } },
    });
  }
  async delete(user: RequestUser, id: number) {
    const unit = await this.prismaTenant.brand.findFirst({
      where: { id },
    });
    if (!unit) {
      throw new NotFoundException('Brand not found');
    }
    return await this.prismaTenant.brand.delete({ where: { id } });
  }
}
