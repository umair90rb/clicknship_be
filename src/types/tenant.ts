import { type Request } from 'express';

export class Tenant {
  tenantId: string;
  companyName: string;
  dbName: string;
}

export class RequestWithTenant extends Request {
  tenant: Tenant;
}
