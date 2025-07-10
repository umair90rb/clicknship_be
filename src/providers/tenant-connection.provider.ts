import { InternalServerErrorException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';

export const tenantConnectionProvider = {
  provide: 'TENANT_CONNECTION',
  useFactory: async (request) => {
    const tenant = request?.tenant;
    if (!tenant) {
      throw new InternalServerErrorException(
        'Make sure to apply tenant middleware',
      );
    }
    const prisma = new PrismaClient({
      datasourceUrl: `${process.env.DATABASE_SERVER_URI}/${tenant.dbName}`,
    });
    request.prismaClient = prisma;
    return prisma;
  },
  inject: [REQUEST],
};
