import { ArrayMinSize, IsArray, IsNotEmpty, IsNumber } from 'class-validator';

export class CreateBookingDto {
  @IsArray()
  @IsNumber({}, { each: true })
  @ArrayMinSize(1)
  orderIds: number[];

  @IsNumber()
  @IsNotEmpty()
  courierId: number;
}
