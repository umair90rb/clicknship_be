import { Module } from '@nestjs/common';
import { UnitController } from './controllers/unit.controller';
import { tenantConnectionProvider } from '@/src/providers/tenant-connection.provider';
import { AuthModule } from '../auth/auth.module';
import { UnitService } from './services/unit.service';
import { BrandController } from './controllers/brand.controller';
import { CategoryController } from './controllers/category.controller';
import { BrandService } from './services/brand.service';
import { CategoryService } from './services/category.service';

@Module({
  imports: [AuthModule],
  controllers: [BrandController, CategoryController, UnitController],
  providers: [
    tenantConnectionProvider,
    UnitService,
    BrandService,
    CategoryService,
  ],
})
export class SettingsModule {}
