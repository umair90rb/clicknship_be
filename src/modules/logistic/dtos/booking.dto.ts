import { Type } from 'class-transformer';
import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreateBookingDto {
  @IsArray()
  @Type(() => Number)
  @ValidateNested({ each: true })
  @Min(1)
  orderIds: Number[];

  @IsNumber()
  @IsNotEmpty()
  courierId: Number;
}
