import { IsBoolean, IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsBoolean()
  rememberMe: boolean;
}

export class RefreshDto {
  @IsNotEmpty()
  @IsString()
  refreshToken: string;
}
