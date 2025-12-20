import {
  IsString,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsNotEmpty,
  IsOptional,
} from 'class-validator';
import { FeedbackCategory } from '../enums/feedback-category.enum';
import { PaginationBodyDto } from '@/src/dtos/pagination.dto';

export class CreateFeedbackDto {
  @IsInt()
  @Min(1)
  @Max(5)
  stars: number;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(FeedbackCategory)
  category: FeedbackCategory;
}

export class ListFeedbackDto extends PaginationBodyDto {
  @IsOptional()
  @IsEnum(FeedbackCategory)
  category?: FeedbackCategory;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  stars?: number;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
