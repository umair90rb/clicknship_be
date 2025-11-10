import { PartialType } from '@nestjs/mapped-types';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { SalesChannelTypeEnum } from '../settings.type';

export class CreateSalesChannelDto {
  @IsNotEmpty()
  @IsEnum(SalesChannelTypeEnum)
  type: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsNumber()
  @IsOptional()
  brandId?: number;
}

export class UpdateSalesChannelDto extends PartialType(CreateSalesChannelDto) {}
