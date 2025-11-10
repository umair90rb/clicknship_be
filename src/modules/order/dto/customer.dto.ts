import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { IsBoolean, IsEmail, IsOptional, IsString } from 'class-validator';

export class ListCustomerBodyDto extends PaginationBodyDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  phone?: string;
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class SearchCustomerDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsBoolean()
  @IsOptional()
  withAddress: boolean;

  @IsBoolean()
  @IsOptional()
  withOrders: boolean;
}
