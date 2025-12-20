import { IsString, IsEnum, IsOptional } from 'class-validator';
import { PaginationBodyDto } from '@/src/dtos/pagination.dto';
import { TransactionType } from '../enums/transaction-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';

export class ListTransactionsDto extends PaginationBodyDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  tenantId?: string;
}
