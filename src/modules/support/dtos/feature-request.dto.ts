import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { FeatureRequestStatus } from '../enums/feature-request-status.enum';
import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { CreateAttachmentMetadataDto } from './attachment.dto';

export class CreateFeatureRequestDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentMetadataDto)
  attachments?: CreateAttachmentMetadataDto[];
}

export class UpdateFeatureRequestStatusDto {
  @IsEnum(FeatureRequestStatus)
  status: FeatureRequestStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ListFeatureRequestsDto extends PaginationBodyDto {
  @IsOptional()
  @IsEnum(FeatureRequestStatus)
  status?: FeatureRequestStatus;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
