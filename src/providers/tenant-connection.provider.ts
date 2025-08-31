import { InternalServerErrorException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient as PrismaTenantClient } from 'prisma/tenant/client';

export const tenantConnectionProvider = {
  provide: 'TENANT_CONNECTION',
  useFactory: async (request) => {
    const tenant = request?.tenant;
    if (!tenant) {
      throw new InternalServerErrorException(
        'Make sure to apply tenant middleware',
      );
    }
    const prisma = new PrismaTenantClient({
      datasourceUrl: `${process.env.TENANT_DATABASE_SERVER_URL}/${tenant.dbName}`,
    });
    request.prismaClient = prisma;
    return prisma;
  },
  inject: [REQUEST],
};
