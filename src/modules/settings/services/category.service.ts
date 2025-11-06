import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { CreateCategoryDto, UpdateCategoryDto } from '../dto/category.dto';

@Injectable()
export class CategoryService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = { id: true, name: true };

  list() {
    return this.prismaTenant.category.findMany({
      select: { ...this.select, _count: { select: { products: true } } },
    });
  }
  get(id: number) {
    return this.prismaTenant.category.findFirst({ where: { id } });
  }
  async create(user: RequestUser, body: CreateCategoryDto) {
    const exited = await this.prismaTenant.category.findFirst({
      where: { name: body.name },
    });
    if (exited) {
      throw new BadRequestException('Category with this name already existed');
    }
    return this.prismaTenant.category.create({
      data: body,
      select: { ...this.select, _count: { select: { products: true } } },
    });
  }
  update(user: RequestUser, id: number, body: UpdateCategoryDto) {
    return this.prismaTenant.category.update({
      where: { id },
      data: body,
      select: { ...this.select, _count: { select: { products: true } } },
    });
  }
  async delete(user: RequestUser, id: number) {
    const unit = await this.prismaTenant.category.findFirst({
      where: { id },
    });
    if (!unit) {
      throw new NotFoundException('Category not found');
    }
    return await this.prismaTenant.category.delete({ where: { id } });
  }
}
