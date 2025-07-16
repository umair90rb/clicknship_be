import { Module } from '@nestjs/common';
import { RoleController } from './role.controller';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [RoleController],
  providers: [tenantConnectionProvider],
})
export class RoleModule {}
