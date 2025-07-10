import {
  IsEmail,
  IsMobilePhone,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class OnboardTenantDto {
  @IsEmail()
  email: string;

  @IsStrongPassword()
  password: string;

  @IsString()
  companyName: string;

  @IsString()
  name: string;

  @IsMobilePhone('en-PK')
  phone: string;
}
