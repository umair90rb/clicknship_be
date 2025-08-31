import { PrismaMasterClient } from '@/src/services/master-connection.server';
import { Module } from '@nestjs/common';
import { MigrationService } from './migration.service';
import { OnboardController } from './onboard.controller';
import { OnboardService } from './onboard.service';
import { TenantService } from './tenant.service';

@Module({
  controllers: [OnboardController],
  providers: [
    OnboardService,
    TenantService,
    PrismaMasterClient,
    MigrationService,
  ],
  exports: [TenantService],
})
export class OnboardModule {}
