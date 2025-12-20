import {
  IsString,
  IsEnum,
  IsNumber,
  IsNotEmpty,
  IsOptional,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';

export class InitiateRechargeDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @IsOptional()
  @IsString()
  customerEmail?: string;

  @IsOptional()
  @IsString()
  customerPhone?: string;
}

export class BankTransferRechargeDto {
  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  screenshotKey: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ConfirmBankTransferDto {
  @IsString()
  @IsNotEmpty()
  paymentRequestId: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class ManualCreditDto {
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  reason: string;
}
