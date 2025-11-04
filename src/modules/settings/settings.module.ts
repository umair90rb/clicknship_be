import { Module } from '@nestjs/common';
import { UnitController } from './controllers/unit.controller';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';
import { UnitService } from './services/unit.service';

@Module({
  imports: [AuthModule],
  controllers: [UnitController],
  providers: [tenantConnectionProvider, UnitService],
})
export class SettingsModule {}
