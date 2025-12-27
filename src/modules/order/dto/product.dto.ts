import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { PartialType } from '@nestjs/mapped-types';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
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

// Product Attribute DTOs
export class CreateProductAttributeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateProductAttributeDto extends PartialType(
  CreateProductAttributeDto,
) {}

export class ListProductAttributeBodyDto extends PaginationBodyDto {}

// Product Attribute Value DTOs
export class CreateProductAttributeValueDto {
  @IsString()
  @IsNotEmpty()
  value: string;

  @IsNumber()
  @IsNotEmpty()
  attributeId: number;
}

export class UpdateProductAttributeValueDto {
  @IsString()
  @IsOptional()
  value?: string;
}

export class ListProductAttributeValueBodyDto extends PaginationBodyDto {
  @IsNumber()
  @IsOptional()
  attributeId?: number;
}

// Product Variant DTOs
export class VariantAttributeDto {
  @IsNumber()
  @IsNotEmpty()
  attributeValueId: number;
}

export class CreateProductVariantDto {
  @IsString()
  @IsNotEmpty()
  sku: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  barcode?: string;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsNumber()
  @IsNotEmpty()
  productId: number;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes?: VariantAttributeDto[];
}

export class UpdateProductVariantDto {
  @IsString()
  @IsOptional()
  sku?: string;

  @Transform(({ value }) => (value === '' ? null : value))
  @IsString()
  @IsOptional()
  barcode?: string;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsNumber()
  @IsOptional()
  unitPrice?: number;

  @Transform(({ value }) =>
    value !== '' && value != null ? Number(value) : null,
  )
  @IsNumber()
  @IsOptional()
  costPrice?: number;

  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeDto)
  attributes?: VariantAttributeDto[];
}

export class ListProductVariantBodyDto extends PaginationBodyDto {
  @IsNumber()
  @IsOptional()
  productId?: number;
}
