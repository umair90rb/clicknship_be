import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DateRangeDto } from './base-filter.dto';
import { ValidateNested } from 'class-validator';

export class InventoryReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by location ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  locationId?: number;

  @ApiPropertyOptional({ description: 'Filter by product ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  productId?: number;

  @ApiPropertyOptional({ description: 'Filter by product category ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filter by brand ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ description: 'Filter by product SKU' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiPropertyOptional({ description: 'Filter by product name (contains)' })
  @IsOptional()
  @IsString()
  productName?: string;
}

export class StockMovementReportFilterDto extends InventoryReportFilterDto {
  @ApiPropertyOptional({ description: 'Date range for movements' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description:
      'Filter by movement types (SALE, RETURN, ADJUSTMENT, PURCHASE, TRANSFER_IN, TRANSFER_OUT, RESERVATION, RESERVATION_RELEASE, DAMAGED, EXPIRED)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  movementTypes?: string[];

  @ApiPropertyOptional({
    description: 'Filter by user ID who made the movement',
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;
}

export class PurchaseOrderReportFilterDto {
  @ApiPropertyOptional({ description: 'Date range for POs' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description:
      'Filter by PO status (DRAFT, ORDERED, PARTIAL, RECEIVED, CANCELLED)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];

  @ApiPropertyOptional({ description: 'Filter by supplier ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  supplierId?: number;
}

export class LowStockReportFilterDto extends InventoryReportFilterDto {
  @ApiPropertyOptional({
    description: 'Include items with zero stock (default: false)',
  })
  @IsOptional()
  includeZeroStock?: boolean;
}
