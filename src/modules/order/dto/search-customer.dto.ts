import { IsBoolean, IsOptional, IsString } from 'class-validator';

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
