import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { RequestUser } from '@/src/types/auth';

@Injectable()
export class CourierService {
  private select = {};
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async list(body: any) {}

  get(id: number) {}

  async create(data: any, user: RequestUser) {}

  update(id: number, body: any, user: RequestUser) {}
  delete(id: number, user: RequestUser) {}
}
