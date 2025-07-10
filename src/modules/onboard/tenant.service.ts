import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/services/prisma.service';
import { Tenant } from './onboard.types';

@Injectable()
export class TenantService {
  constructor(private prisma: PrismaService) {}

  getTenantById(tenantId: string) {
    return this.prisma.tenant.findFirst({
      where: { tenantId },
    });
  }

  createTenant(data: Tenant) {
    return this.prisma.tenant.create({ data });
  }
}
