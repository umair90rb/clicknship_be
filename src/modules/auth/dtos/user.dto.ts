import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsEmail,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class ListUserBodyDto extends PaginationBodyDto {
  @IsOptional()
  @IsString()
  name?: string;
  @IsOptional()
  @IsString()
  phone?: string;
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsNotEmpty()
  @IsEmail()
  email: string;

  @IsNotEmpty()
  @IsString()
  @IsStrongPassword()
  password: string;

  @IsNotEmpty()
  @IsNumber()
  roleId: number;
}

export class UpdateUserDto extends PartialType(CreateUserDto) {}
