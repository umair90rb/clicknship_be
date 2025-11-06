import { PartialType } from '@nestjs/mapped-types';
import { IsBoolean, IsString } from 'class-validator';

export class CreateBrandDto {
  @IsString()
  name: string;

  @IsBoolean()
  active: boolean;
}

export class UpdateBrandDto extends PartialType(CreateBrandDto) {}
