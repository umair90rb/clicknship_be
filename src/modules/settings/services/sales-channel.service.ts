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
import { SalesChannelTypeEnum } from '../settings.type';

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
    const { type, source, ...rest } = body;
    let channelSource = source;
    if (type === SalesChannelTypeEnum.SHOPIFY) {
      if (channelSource.includes(' ')) {
        throw new BadRequestException(
          'Invalid source, empty spaces not allowed',
        );
      }
      channelSource = channelSource.includes('myshopify.com')
        ? channelSource
        : `${channelSource}.myshopify.com`;
    }
    const exited = await this.prismaTenant.channel.findFirst({
      where: { source: channelSource },
    });
    if (exited) {
      throw new BadRequestException('Duplicate source not allowed');
    }
    return this.prismaTenant.channel.create({
      data: { ...rest, type, source: channelSource },
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
