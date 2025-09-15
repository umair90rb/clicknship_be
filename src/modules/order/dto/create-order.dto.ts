import {
    IsOptional,
    IsString,
    IsNumber,
    IsArray,
    ValidateNested,
    IsEnum,
    IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsNumber()
    unitPrice?: number;

    @IsOptional()
    @IsNumber()
    grams?: number;

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
    productId?: number;

    @IsOptional()
    @IsNumber()
    variantId?: number;
}


export class CreateAddressDto {
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
    @IsString()
    phone?: string;

    @IsOptional()
    @IsNumber()
    zip?: number;

    @IsOptional()
    @IsString()
    province?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsNumber()
    longitude?: number;

    @IsOptional()
    @IsNumber()
    latitude?: number;
}


export class CreatePaymentDto {
    @IsString()
    type: string;

    @IsOptional()
    @IsString()
    bank?: string;

    @IsOptional()
    @IsString()
    tId?: string;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    note?: string;
}


export class CreateOrderDto {
    @IsOptional()
    @IsString()
    orderNumber?: string;

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
    status?: string; // If you have status enum, replace with IsEnum

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
    @IsDateString()
    assignedAt?: string;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreateOrderItemDto)
    items?: CreateOrderItemDto[];

    @IsOptional()
    @ValidateNested()
    @Type(() => CreateAddressDto)
    address?: CreateAddressDto;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => CreatePaymentDto)
    payments?: CreatePaymentDto[];

}