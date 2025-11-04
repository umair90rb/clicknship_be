import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import { CreateUnitDto, UpdateUnitDto } from '../dto/unit.dto';

@Injectable()
export class UnitService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = { id: true, name: true };

  list() {
    return this.prismaTenant.unitOfMeasure.findMany({ select: this.select });
  }
  get(id: number) {
    return this.prismaTenant.unitOfMeasure.findFirst({ where: { id } });
  }
  async create(user: RequestUser, body: CreateUnitDto) {
    const exited = await this.prismaTenant.unitOfMeasure.findFirst({
      where: { name: body.name },
    });
    if (exited) {
      throw new BadRequestException('Unit with this name already existed');
    }
    return this.prismaTenant.unitOfMeasure.create({
      data: body,
      select: this.select,
    });
  }
  update(user: RequestUser, id: number, body: UpdateUnitDto) {
    return this.prismaTenant.unitOfMeasure.update({
      where: { id },
      data: body,
      select: this.select,
    });
  }
  async delete(user: RequestUser, id: number) {
    const unit = await this.prismaTenant.unitOfMeasure.findFirst({
      where: { id },
    });
    if (!unit) {
      throw new NotFoundException('Unit not found');
    }
    return await this.prismaTenant.unitOfMeasure.delete({ where: { id } });
  }
}
