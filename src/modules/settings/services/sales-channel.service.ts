import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { RequestUser } from '@/src/types/auth';
import {
  CreateSalesChannelDto,
  UpdateSalesChannelDto,
} from '../dto/sales-channel.dto';

@Injectable()
export class SalesChannelService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    name: true,
    source: true,
    type: true,
    brand: { select: { name: true } },
  };

  list() {
    return this.prismaTenant.channel.findMany({ select: this.select });
  }

  get(id: number) {
    return this.prismaTenant.channel.findFirst({ where: { id } });
  }

  async create(user: RequestUser, body: CreateSalesChannelDto) {
    const exited = await this.prismaTenant.channel.findFirst({
      where: { name: body.source },
    });
    if (exited) {
      throw new BadRequestException(
        'Sales channel with this name already existed',
      );
    }
    return this.prismaTenant.channel.create({
      data: body,
      select: this.select,
    });
  }

  update(user: RequestUser, id: number, body: UpdateSalesChannelDto) {
    return this.prismaTenant.channel.update({
      where: { id },
      data: body,
      select: this.select,
    });
  }

  async delete(user: RequestUser, id: number) {
    const unit = await this.prismaTenant.channel.findFirst({
      where: { id },
    });
    if (!unit) {
      throw new NotFoundException('Sales channel not found');
    }
    return await this.prismaTenant.channel.delete({ where: { id } });
  }
}
