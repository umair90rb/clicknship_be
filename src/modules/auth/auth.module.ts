import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OnboardModule } from '../onboard/onboard.module';
import { JwtService } from '@nestjs/jwt';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { RoleService } from '../role/role.service';
import { RoleController } from '../role/role.controller';

@Module({
  imports: [OnboardModule],
  controllers: [AuthController, RoleController],
  providers: [AuthService, tenantConnectionProvider, JwtService, RoleService],
  exports: [AuthService, RoleService],
})
export class AuthModule {}
