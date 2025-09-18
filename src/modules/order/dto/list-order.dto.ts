import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../dtos/pagination.dto';

export class ListOrdersQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  city?: string;
}
