import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { TenantService } from './tenant.service';
import { PrismaService } from 'src/services/prisma.service';
import { OnboardTenantDto } from './dtos/onboard.dto';
import { PrismaClient } from '@prisma/client';
import { MigrationService } from './migration.service';
import { User } from './onboard.types';
import { nanoid } from 'nanoid';
import encrypt from 'src/utils/encrypt';

@Injectable()
export class OnboardService {
  constructor(
    private tenantService: TenantService,
    private prisma: PrismaService,
    private migrationService: MigrationService,
  ) {}
  async onboard(registrationData: OnboardTenantDto) {
    const { companyName, ...user } = registrationData;
    //make tenant id from company name
    const tenantId = companyName.toLowerCase().replace(/\s+/g, '-');
    const dbName = `tenant_${tenantId.replace(/-/g, '_')}`;
    //check if tenant id is available
    const isExists = await this.tenantService.getTenantById(tenantId);
    if (isExists) {
      throw new BadRequestException(
        'Company name already taken, try with another one',
      );
    }
    //create tenant in db
    const tenant = await this.tenantService.createTenant({
      companyName,
      tenantId,
      dbName,
    });
    if (!tenant) {
      throw new BadRequestException('Something went wrong, try again later');
    }
    try {
      //create tenant database
      await this.prisma.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
      //run migrations for tenant database
      await this.migrationService.migrateTenant(dbName);
      await this.dropTablesForTenant(tenantId, dbName);
      //create user in tenant database
      await this.addUserToTenant(tenantId, dbName, user);
      await this.generateTenantJWTSecret(tenantId, dbName);
      //return the tenantId on which user will redirect to login.
      return { tenantId };
    } catch (error) {
      console.log(error);
      await this.prisma.tenant.delete({ where: { tenantId } });
      await this.prisma.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${dbName}' AND pid <> pg_backend_pid();
        `);

      await this.prisma.$executeRawUnsafe(
        `DROP DATABASE IF EXISTS "${dbName}"`,
      );
      throw new BadRequestException('Something went wrong, try again later');
    }
  }

  async addUserToTenant(
    tenantId: string,
    dbName: string,
    data: User,
  ): Promise<void> {
    const prisma = await this.getTenantPrismaClient(tenantId, dbName);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: { ...data, password: hashedPassword },
    });
    await prisma.$disconnect();
  }

  async generateTenantJWTSecret(
    tenantId: string,
    dbName: string,
  ): Promise<void> {
    const prisma = await this.getTenantPrismaClient(tenantId, dbName);
    const jwtSecret = nanoid(128);
    const encryptedJwtSecret = encrypt(jwtSecret, process.env.ENCRYPTION_KEY);
    await prisma.secret.create({
      data: { key: 'jwt_secret', value: encryptedJwtSecret },
    });
    await prisma.$disconnect();
  }

  async dropTablesForTenant(tenantId: string, dbName: string): Promise<void> {
    const prisma = await this.getTenantPrismaClient(tenantId, dbName);
    await prisma.$executeRawUnsafe(`drop table if exists "tenants"`);
    await prisma.$disconnect();
  }

  async getTenantPrismaClient(
    tenantId: string,
    dbName: string,
  ): Promise<PrismaClient> {
    const tenant = await this.tenantService.getTenantById(tenantId);
    if (!tenant) {
      throw new BadRequestException('Tenant does not exist');
    }
    const prisma = new PrismaClient({
      datasourceUrl: `${process.env.DATABASE_SERVER_URI}/${dbName}`,
    });
    return prisma;
  }
}
