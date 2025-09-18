import { IsOptional, IsNumber, IsNumberString } from 'class-validator';

export class PaginationQueryDto {
  @IsOptional()
  @IsNumberString()
  skip?: string = '0';

  @IsOptional()
  @IsNumberString()
  take?: string = '100';
}
