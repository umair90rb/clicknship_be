import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SupportCaseStatus } from '../enums/support-case-status.enum';
import { SupportCasePriority } from '../enums/support-case-priority.enum';
import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { CreateAttachmentMetadataDto } from './attachment.dto';

export class CreateSupportCaseDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsEnum(SupportCasePriority)
  priority?: SupportCasePriority;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAttachmentMetadataDto)
  attachments?: CreateAttachmentMetadataDto[];
}

export class UpdateSupportCaseStatusDto {
  @IsEnum(SupportCaseStatus)
  status: SupportCaseStatus;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ListSupportCasesDto extends PaginationBodyDto {
  @IsOptional()
  @IsEnum(SupportCaseStatus)
  status?: SupportCaseStatus;

  @IsOptional()
  @IsEnum(SupportCasePriority)
  priority?: SupportCasePriority;

  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  title?: string;
}
