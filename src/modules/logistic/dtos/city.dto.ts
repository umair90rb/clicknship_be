import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { IsOptional, IsString } from 'class-validator';

export class ListCityDto extends PaginationBodyDto {
  @IsString()
  @IsOptional()
  city?: string;
}
