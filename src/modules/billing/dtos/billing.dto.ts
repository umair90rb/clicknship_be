import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { PaymentStatus } from '../enums/payment-status.enum';

export class UpdateNegativeLimitDto {
  @IsNumber()
  negativeLimit: number;
}

export class ListBillingsDto extends PaginationBodyDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  isBlocked?: boolean;
}

export class ListPaymentRequestsDto extends PaginationBodyDto {
  @IsOptional()
  @IsString()
  tenantId?: string;

  @IsOptional()
  @IsString()
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
