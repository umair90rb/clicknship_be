import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class ListProductBodyDto extends PaginationBodyDto {
  @IsOptional()
  @IsObject()
  unitPrice?: { min?: string; max?: string };
  @IsOptional()
  @IsObject()
  costPrice?: { min?: string; max?: string };
  @IsOptional()
  @IsObject()
  weight?: { min?: string; max?: string };
  @IsOptional()
  @IsObject()
  incentive?: { min?: string; max?: string };
}

export class CreateProductDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  sku: string;

  @IsString()
  @IsOptional()
  barcode: string;

  @IsBoolean()
  @IsOptional()
  active: boolean;

  @IsNumber()
  unitPrice: number;

  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @IsNumber()
  @IsOptional()
  weight?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  categoryId?: number;

  @IsNumber()
  @IsOptional()
  brandId?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class SearchProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
