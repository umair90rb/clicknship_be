import { IsOptional, IsNumber, IsNumberString } from 'class-validator';

export class PaginationBodyDto {
  @IsOptional()
  @IsNumber()
  skip?: number = 0;

  @IsOptional()
  @IsNumber()
  take?: number = 100;
}
