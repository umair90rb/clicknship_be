import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class PostItemDto {
  @IsNumber()
  @IsNotEmpty()
  itemId: number;

  @IsString()
  @IsNotEmpty()
  variantId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  sku: string;

  @IsNumber()
  @IsNotEmpty()
  quantity: number;

  @IsNumber()
  @IsNotEmpty()
  discount: number;

  @IsNumber()
  @IsNotEmpty()
  unitPrice: number;

  @IsNumber()
  @IsNotEmpty()
  grams: number;
}
