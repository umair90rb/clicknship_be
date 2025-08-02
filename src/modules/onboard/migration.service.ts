import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

@Injectable()
export class MigrationService {
  async migrateTenant(dbName: string) {
    const url = `${process.env.DATABASE_SERVER_URI}/${dbName}`;
    console.log(`Running migrations for tenant database: ${url}`);
    try {
      const result = await execAsync(
        `npx prisma migrate deploy --schema=./dist/prisma/schema.prisma`,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            DATABASE_URI: url,
            PATH: process.env.PATH,
          },
        },
      );
      console.log(`Migration result for tenant ${dbName}:`, result.stdout);
      return true;
    } catch (error) {
      console.error(`Migration failed for tenant ${dbName}`, error);
      throw error;
    }
  }

  async seedDb(dbName: string) {
    const url = `${process.env.DATABASE_SERVER_URI}/${dbName}`;
    console.log(`Running seeders for tenant database: ${url}`);
    try {
      const result = await execAsync(
        `npx prisma migrate deploy --schema=./dist/prisma/schema.prisma`,
        {
          cwd: process.cwd(),
          env: {
            ...process.env,
            DATABASE_URI: url,
            PATH: process.env.PATH,
          },
        },
      );
      console.log(`Migration result for tenant ${dbName}:`, result.stdout);
      return true;
    } catch (error) {
      console.error(`Migration failed for tenant ${dbName}`, error);
      throw error;
    }
  }
}
