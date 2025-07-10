import { Module } from '@nestjs/common';
import { OnboardService } from './onboard.service';
import { OnboardController } from './onboard.controller';
import { TenantService } from './tenant.service';
import { PrismaService } from 'src/services/prisma.service';
import { MigrationService } from './migration.service';

@Module({
  controllers: [OnboardController],
  providers: [OnboardService, TenantService, PrismaService, MigrationService],
  exports: [TenantService],
})
export class OnboardModule {}
