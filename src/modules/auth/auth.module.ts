import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { OnboardModule } from '../onboard/onboard.module';
import { JwtService } from '@nestjs/jwt';
import { tenantConnectionProvider } from 'src/providers/tenant-connection.provider';

@Module({
  imports: [OnboardModule],
  controllers: [AuthController],
  providers: [AuthService, tenantConnectionProvider, JwtService],
})
export class AuthModule {}
