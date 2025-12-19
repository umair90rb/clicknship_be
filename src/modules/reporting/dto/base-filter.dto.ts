import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class DateRangeDto {
  @ApiPropertyOptional({ description: 'Start date (ISO string with time)' })
  @IsOptional()
  @IsDateString()
  start?: string;

  @ApiPropertyOptional({ description: 'End date (ISO string with time)' })
  @IsOptional()
  @IsDateString()
  end?: string;
}

export class BaseReportFilterDto {
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

  @ApiPropertyOptional({ description: 'Date range filter based on createdAt' })
  @IsOptional()
  @ValidateNested()
  @Type(() => DateRangeDto)
  dateRange?: DateRangeDto;

  @ApiPropertyOptional({ description: 'Filter by city from order address' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Filter by courier service ID' })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  courierServiceId?: number;

  @ApiPropertyOptional({ description: 'Filter by order statuses' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];
}
