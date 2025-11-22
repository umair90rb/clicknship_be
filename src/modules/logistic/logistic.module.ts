import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CityController } from './controllers/city.controller';
import { CourierController } from './controllers/courier.controller';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { CityService } from './services/city.service';
import { CourierService } from './services/courier.service';
import { PrismaMasterClient } from '@/src/services/master-connection.service';

@Module({
  imports: [AuthModule],
  controllers: [CityController, CourierController],
  providers: [
    tenantConnectionProvider,
    CityService,
    CourierService,
    PrismaMasterClient,
  ],
})
export class LogisticModule {}
