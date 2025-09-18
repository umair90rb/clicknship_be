import {
  IsOptional,
  IsString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrderStatus } from '@/src/types/order';

export class CreateOrderItemDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  unitPrice?: number;

  @IsOptional()
  @IsNumber()
  quantity?: number;

  @IsOptional()
  @IsNumber()
  discount?: number;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsNumber()
  grams?: number;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  variantId?: string;
}

export class CreateAddressDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  zip?: number;

  @IsOptional()
  @IsString()
  province?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class CreatePaymentDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  bank: string;

  @IsOptional()
  @IsString()
  tId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateCustomerDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  email?: string;
}

export class CreateOrderDto {
  @IsOptional()
  @IsNumber()
  totalAmount?: number;

  @IsOptional()
  @IsNumber()
  totalTax?: number;

  @IsOptional()
  @IsNumber()
  totalDiscount?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  status?: OrderStatus;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsNumber()
  customerId?: number;

  @IsOptional()
  @IsNumber()
  channelId?: number;

  @IsOptional()
  @IsNumber()
  brandId?: number;

  @IsOptional()
  @IsNumber()
  courierServiceId?: number;

  @IsOptional()
  @IsNumber()
  userId?: number;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items?: CreateOrderItemDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAddressDto)
  address?: CreateAddressDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateCustomerDto)
  customer?: CreateCustomerDto;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePaymentDto)
  payments?: CreatePaymentDto[];
}
