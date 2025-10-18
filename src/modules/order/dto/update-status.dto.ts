import { OrderStatus } from '@/src/types/order';
import { IsEnum, IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class UpdateOrderStatusDto {
  @IsString()
  @IsEnum(OrderStatus)
  @IsNotEmpty()
  status: string;
}
