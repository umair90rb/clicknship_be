import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { TENANT_CONNECTION_PROVIDER } from "@/src/constants/common";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class RoleService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}
}