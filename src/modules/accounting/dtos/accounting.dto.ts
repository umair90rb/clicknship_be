import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import {
  AccountType,
  AccountSubType,
  InvoiceStatus,
  BillStatus,
  PaymentType,
  PaymentMethod,
  CodRemittanceStatus,
  JournalReferenceType,
} from '../accounting.types';

// ============ Account DTOs ============

export class CreateAccountDto {
  @ApiProperty()
  @IsString()
  code: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ enum: AccountType })
  @IsEnum(AccountType)
  type: AccountType;

  @ApiPropertyOptional({ enum: AccountSubType })
  @IsOptional()
  @IsEnum(AccountSubType)
  subType?: AccountSubType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  parentId?: number;
}

export class UpdateAccountDto extends PartialType(CreateAccountDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ============ Fiscal Period DTOs ============

export class CreateFiscalPeriodDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;
}

export class UpdateFiscalPeriodDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}

// ============ Journal Entry DTOs ============

export class JournalEntryLineDto {
  @ApiProperty()
  @IsNumber()
  accountId: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  debit: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  credit: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;
}

export class CreateJournalEntryDto {
  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: JournalReferenceType })
  @IsOptional()
  @IsEnum(JournalReferenceType)
  referenceType?: JournalReferenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  referenceId?: number;

  @ApiProperty({ type: [JournalEntryLineDto] })
  @IsArray()
  @ArrayMinSize(2)
  @ValidateNested({ each: true })
  @Type(() => JournalEntryLineDto)
  lines: JournalEntryLineDto[];
}

// ============ Invoice DTOs ============

export class InvoiceItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  taxRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  productId?: number;
}

export class CreateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [InvoiceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items: InvoiceItemDto[];
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;
}

// ============ Bill DTOs ============

export class BillItemDto {
  @ApiProperty()
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accountId?: number;
}

export class CreateBillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  supplierId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  purchaseOrderId?: number;

  @ApiProperty()
  @IsDateString()
  issueDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [BillItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BillItemDto)
  items: BillItemDto[];
}

export class UpdateBillDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;
}

// ============ Payment DTOs ============

export class CreatePaymentDto {
  @ApiProperty({ enum: PaymentType })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiProperty({ enum: PaymentMethod })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  invoiceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  billId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankAccount?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionRef?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

// ============ COD Remittance DTOs ============

export class CodRemittanceItemDto {
  @ApiProperty()
  @IsNumber()
  orderId: number;

  @ApiProperty()
  @IsString()
  cn: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  courierCharge: number;
}

export class CreateCodRemittanceDto {
  @ApiProperty()
  @IsNumber()
  courierServiceId: number;

  @ApiProperty()
  @IsDateString()
  statementDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankReference?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ type: [CodRemittanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CodRemittanceItemDto)
  items: CodRemittanceItemDto[];
}

export class UpdateCodRemittanceStatusDto {
  @ApiProperty({ enum: CodRemittanceStatus })
  @IsEnum(CodRemittanceStatus)
  status: CodRemittanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bankReference?: string;
}

// ============ Tax Rate DTOs ============

export class CreateTaxRateDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  rate: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  accountId?: number;
}

export class UpdateTaxRateDto extends PartialType(CreateTaxRateDto) {
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

// ============ Query DTOs ============

export class AccountQueryDto {
  @ApiPropertyOptional({ enum: AccountType })
  @IsOptional()
  @IsEnum(AccountType)
  type?: AccountType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean;
}

export class JournalQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  accountId?: number;

  @ApiPropertyOptional({ enum: JournalReferenceType })
  @IsOptional()
  @IsEnum(JournalReferenceType)
  referenceType?: JournalReferenceType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;
}

export class InvoiceQueryDto {
  @ApiPropertyOptional({ enum: InvoiceStatus })
  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  customerId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class BillQueryDto {
  @ApiPropertyOptional({ enum: BillStatus })
  @IsOptional()
  @IsEnum(BillStatus)
  status?: BillStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  supplierId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class PaymentQueryDto {
  @ApiPropertyOptional({ enum: PaymentType })
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class CodRemittanceQueryDto {
  @ApiPropertyOptional({ enum: CodRemittanceStatus })
  @IsOptional()
  @IsEnum(CodRemittanceStatus)
  status?: CodRemittanceStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  courierServiceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  toDate?: string;
}
