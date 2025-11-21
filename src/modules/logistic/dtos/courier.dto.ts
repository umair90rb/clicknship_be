import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBooleanString,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

export class ListCourierIntegrationDto extends PaginationBodyDto {
  @IsString()
  @IsOptional()
  courier?: string;

  @IsBooleanString()
  @IsOptional()
  active?: string;
}

class FieldDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  value: string;
}

export class CreateCourierIntegrationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  courier: string;

  @IsString()
  @IsOptional()
  returnAddress: string;

  @IsString()
  @IsOptional()
  dispatchAddress: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => FieldDto)
  fields: FieldDto[];
}

export class UpdateCourierIntegrationDto extends PartialType(
  CreateCourierIntegrationDto,
) {}
