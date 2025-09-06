import { InternalServerErrorException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient as PrismaTenantClient } from 'prisma/tenant/client';
import { TENANT_CONNECTION_PROVIDER } from '../constants/common';
import { TENANT_MIDDLEWARE_NOT_APPLIED } from '../constants/errors';

export const tenantConnectionProvider = {
  provide: TENANT_CONNECTION_PROVIDER,
  useFactory: async (request) => {
    const tenant = request?.tenant;
    if (!tenant) {
      throw new InternalServerErrorException(TENANT_MIDDLEWARE_NOT_APPLIED);
    }
    const prisma = new PrismaTenantClient({
      datasourceUrl: `${process.env.TENANT_DATABASE_SERVER_URL}/${tenant.dbName}`,
    });
    request.prismaClient = prisma;
    return prisma;
  },
  inject: [REQUEST],
};
