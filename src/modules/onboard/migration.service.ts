import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class MigrationService {
  private readonly logger = new Logger(MigrationService.name);
  async migrateTenant(dbName: string) {
    const url = `${process.env.TENANT_DATABASE_SERVER_URL}/${dbName}`;
    this.logger.log(`Running migrations for tenant database: ${url}`);
    try {
      const result = await execAsync(
        `npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            DATABASE_URL: url,
            PATH: process.env.PATH,
          },
        },
      );
      this.logger.log(`Migration result for tenant ${dbName}:`, result.stdout);
      return true;
    } catch (error) {
      this.logger.error(`Migration failed for tenant ${dbName}`, error);
      throw error;
    }
  }

  async seedDb(dbName: string) {
    const url = `${process.env.TENANT_DATABASE_SERVER_URL}/${dbName}`;
    this.logger.log(`Running seeders for tenant database: ${url}`);
    try {
      const result = await execAsync(
        `npx prisma migrate deploy --schema=prisma/tenant/schema.prisma`,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            DATABASE_URL: url,
            PATH: process.env.PATH,
          },
        },
      );
      this.logger.log(`Migration result for tenant ${dbName}:`, result.stdout);
      return true;
    } catch (error) {
      this.logger.error(`Migration failed for tenant ${dbName}`, error);
      throw error;
    }
  }
}
