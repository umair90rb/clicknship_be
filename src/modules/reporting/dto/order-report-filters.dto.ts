import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BaseReportFilterDto } from './base-filter.dto';

export class AgentReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by specific user/agent ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  userId?: number;
}

export class ProductReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by product name (contains)' })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional({ description: 'Filter by product SKU' })
  @IsOptional()
  @IsString()
  sku?: string;
}

export class CourierReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by courier name (TCS, Leopards, etc.)',
  })
  @IsOptional()
  @IsString()
  courierName?: string;
}

export class WebhookReportFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({ description: 'Filter by Shopify domain' })
  @IsOptional()
  @IsString()
  domain?: string;

  @ApiPropertyOptional({ description: 'Filter by webhook topic' })
  @IsOptional()
  @IsString()
  topic?: string;
}

export class FocReportFilterDto extends BaseReportFilterDto {}

export class BookedProductValueFilterDto extends BaseReportFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by order statuses for booked products',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookedStatuses?: string[];
}
