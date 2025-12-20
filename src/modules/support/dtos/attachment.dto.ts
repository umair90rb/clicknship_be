import {
  IsString,
  IsEnum,
  IsNotEmpty,
  IsInt,
  Min,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum FileType {
  image = 'image',
  audio = 'audio',
  video = 'video',
}

export class CreateAttachmentMetadataDto {
  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsEnum(FileType)
  fileType: FileType;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  fileSize: number;
}

export class ConfirmAttachmentUploadDto {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  fileName: string;

  @IsEnum(FileType)
  fileType: FileType;

  @IsString()
  @IsNotEmpty()
  mimeType: string;

  @IsInt()
  @Min(1)
  fileSize: number;
}

export class ConfirmAttachmentsBodyDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfirmAttachmentUploadDto)
  attachments: ConfirmAttachmentUploadDto[];
}
