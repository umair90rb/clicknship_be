import { PrismaClient, Role } from '@/prisma/tenant/client';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { SUPER_ADMIN_ROLE } from 'src/constants/common';
import encrypt from 'src/utils/encrypt';
import { RESOURCES_PERMISSIONS_LIST } from '../../auth/constants/permission-list';
import { OnboardTenantDto } from '../dtos/onboard.dto';
import { MigrationService } from './migration.service';
import { User } from '../onboard.types';
import { TenantService } from './tenant.service';
import { tenantWithPrefix } from '@/src/utils/tenant';
import { getDbUrl } from '../utils';

@Injectable()
export class OnboardService {
  constructor(
    private prismaMaster: PrismaMasterClient,
    private tenantService: TenantService,
    private migrationService: MigrationService,
  ) {}
  async onboard(registrationData: OnboardTenantDto) {
    const { companyName, ...userData } = registrationData;
    //make tenant id from company name
    const tenantId = companyName.toLowerCase().replace(/\s+/g, '-');
    const dbName = tenantWithPrefix(tenantId.replace(/-/g, '_'));
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
      await this.prismaMaster.$executeRawUnsafe(`CREATE DATABASE ${dbName}`);
      //run migrations for tenant database
      await this.migrationService.migrateTenant(dbName);
      // await this.dropTablesForTenant(tenantId, dbName); cause issue for future migrations, need other way to drop tables like tenant
      //create user in tenant database
      const superAdminRole = await this.createSuperAdminRole(tenantId, dbName);
      await this.addSuperUserToTenant(
        tenantId,
        dbName,
        userData,
        superAdminRole,
      );
      await this.generateTenantJWTSecret(tenantId, dbName);
      //return the tenantId on which user will redirect to login.
      return { tenantId };
    } catch (error) {
      console.log(error);
      await this.prismaMaster.tenant.delete({ where: { tenantId } });
      await this.prismaMaster.$executeRawUnsafe(`
        SELECT pg_terminate_backend(pid)
        FROM pg_stat_activity
        WHERE datname = '${dbName}' AND pid <> pg_backend_pid();
        `);

      await this.prismaMaster.$executeRawUnsafe(
        `DROP DATABASE IF EXISTS "${dbName}"`,
      );
      throw new BadRequestException('Something went wrong, try again later');
    }
  }

  async addSuperUserToTenant(
    tenantId: string,
    dbName: string,
    data: User,
    role: Role,
  ): Promise<void> {
    const prisma = await this.getTenantPrismaClient(tenantId, dbName);
    const hashedPassword = await bcrypt.hash(data.password, 10);
    await prisma.user.create({
      data: { ...data, password: hashedPassword, roleId: role.id },
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

  async createSuperAdminRole(tenantId: string, dbName: string): Promise<Role> {
    const prisma = await this.getTenantPrismaClient(tenantId, dbName);
    console.log('created super admin role...');
    const role = await prisma.role.create({
      data: {
        name: SUPER_ADMIN_ROLE,
        permissions: {
          createMany: {
            data: RESOURCES_PERMISSIONS_LIST,
          },
        },
      },
    });
    console.log('super admin role created.');
    await prisma.$disconnect();
    return role;
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
      datasourceUrl: getDbUrl(dbName),
    });
    return prisma;
  }
}
