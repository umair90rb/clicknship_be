import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { OnboardModule } from '../onboard/onboard.module';
import { JwtService } from '@nestjs/jwt';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';
import { RoleController } from './controllers/role.controller';
import { RoleService } from './services/role.service';
import { UserController } from './controllers/user.controller';
import { UserService } from './services/user.service';

@Module({
  imports: [OnboardModule],
  controllers: [AuthController, RoleController, UserController],
  providers: [
    AuthService,
    tenantConnectionProvider,
    JwtService,
    RoleService,
    UserService,
  ],
  exports: [AuthService, RoleService],
})
export class AuthModule {}
