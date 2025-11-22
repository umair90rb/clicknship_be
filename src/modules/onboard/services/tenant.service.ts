import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { Injectable } from '@nestjs/common';
import { Tenant } from 'src/types/tenant';

@Injectable()
export class TenantService {
  constructor(private prismaMaster: PrismaMasterClient) {}

  getTenantById(tenantId: string) {
    return this.prismaMaster.tenant.findFirst({
      where: { tenantId },
    });
  }

  createTenant(data: Tenant) {
    return this.prismaMaster.tenant.create({ data });
  }
}
