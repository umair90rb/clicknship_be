import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
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
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  barcode: string;

  @IsBoolean()
  @IsOptional()
  active: boolean;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : value,
  )
  @IsNumber()
  @IsNotEmpty()
  unitPrice: number;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsOptional()
  @IsNumber()
  costPrice?: number;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsOptional()
  @IsNumber()
  weight?: number;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsOptional()
  @IsNumber()
  incentive?: number;

  @Transform(({ value }) => (value === '' ? null : value))
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
