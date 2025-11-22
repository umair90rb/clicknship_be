import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { Module } from '@nestjs/common';
import { MigrationService } from '@/src/modules/onboard/services/migration.service';
import { OnboardController } from '@/src/modules/onboard/onboard.controller';
import { OnboardService } from '@/src/modules/onboard/services/onboard.service';
import { TenantService } from '@/src/modules/onboard/services/tenant.service';

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
