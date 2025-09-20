import { IsArray, IsObject, IsOptional, IsString } from 'class-validator';
import { PaginationBodyDto } from '../../dtos/pagination.dto';

export class ListOrdersBodyDto extends PaginationBodyDto {
  @IsOptional()
  @IsString()
  orderNumber?: string;

  @IsOptional()
  @IsString()
  channel?: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  status?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsObject()
  totalAmount?: { min?: string; max?: string };

  @IsOptional()
  @IsObject()
  createdAt?: { min?: string; max?: string };
}
