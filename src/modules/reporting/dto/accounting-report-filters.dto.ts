import { IsOptional, IsNumber, IsString, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { DateRangeDto } from './base-filter.dto';
import { ValidateNested } from 'class-validator';

export class RevenueReportFilterDto {
  @ApiPropertyOptional({ description: 'Date range' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description: 'Group by: day, week, month, quarter, year',
    enum: ['day', 'week', 'month', 'quarter', 'year'],
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';

  @ApiPropertyOptional({ description: 'Filter by brand ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ description: 'Filter by channel ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  channelId?: number;

  @ApiPropertyOptional({ description: 'Filter by order statuses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];
}

export class InvoiceAgingFilterDto {
  @ApiPropertyOptional({ description: 'As of date for aging calculation' })
  @IsOptional()
  @IsString()
  asOfDate?: string;

  @ApiPropertyOptional({ description: 'Filter by customer ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional({
    description: 'Aging buckets in days (e.g., [30, 60, 90, 120])',
  })
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  @Type(() => Number)
  agingBuckets?: number[];
}

export class CodRemittanceReportFilterDto {
  @ApiPropertyOptional({ description: 'Date range' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({ description: 'Filter by courier service ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  courierServiceId?: number;

  @ApiPropertyOptional({
    description:
      'Filter by remittance status (PENDING, RECEIVED, RECONCILED, DISPUTED)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  statuses?: string[];
}

export class PaymentReportFilterDto {
  @ApiPropertyOptional({ description: 'Date range' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({
    description:
      'Filter by payment type (RECEIPT, DISBURSEMENT, REFUND, COD_REMITTANCE)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  types?: string[];

  @ApiPropertyOptional({
    description:
      'Filter by payment method (CASH, BANK_TRANSFER, COD, CARD, WALLET, CHEQUE)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  methods?: string[];
}

export class ProfitSummaryFilterDto {
  @ApiPropertyOptional({ description: 'Date range' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({ description: 'Filter by brand ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  brandId?: number;

  @ApiPropertyOptional({ description: 'Filter by channel ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  channelId?: number;

  @ApiPropertyOptional({
    description: 'Group by: day, week, month',
    enum: ['day', 'week', 'month'],
  })
  @IsOptional()
  @IsString()
  groupBy?: 'day' | 'week' | 'month';
}
