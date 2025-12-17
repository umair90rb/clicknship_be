export enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

export enum AccountSubType {
  // Assets
  CASH = 'CASH',
  BANK = 'BANK',
  ACCOUNTS_RECEIVABLE = 'ACCOUNTS_RECEIVABLE',
  INVENTORY = 'INVENTORY',
  PREPAID_EXPENSE = 'PREPAID_EXPENSE',
  FIXED_ASSET = 'FIXED_ASSET',

  // Liabilities
  ACCOUNTS_PAYABLE = 'ACCOUNTS_PAYABLE',
  TAX_PAYABLE = 'TAX_PAYABLE',
  ACCRUED_EXPENSE = 'ACCRUED_EXPENSE',

  // Equity
  OWNERS_EQUITY = 'OWNERS_EQUITY',
  RETAINED_EARNINGS = 'RETAINED_EARNINGS',

  // Revenue
  SALES = 'SALES',
  SHIPPING_REVENUE = 'SHIPPING_REVENUE',
  OTHER_INCOME = 'OTHER_INCOME',

  // Expenses
  COGS = 'COGS',
  SHIPPING_EXPENSE = 'SHIPPING_EXPENSE',
  COURIER_CHARGES = 'COURIER_CHARGES',
  OPERATING_EXPENSE = 'OPERATING_EXPENSE',
  SALES_RETURNS = 'SALES_RETURNS',
}

export enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

export enum JournalReferenceType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  COD_REMITTANCE = 'COD_REMITTANCE',
}

export enum FiscalPeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum BillStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export enum PaymentType {
  RECEIPT = 'RECEIPT',
  DISBURSEMENT = 'DISBURSEMENT',
  REFUND = 'REFUND',
  COD_REMITTANCE = 'COD_REMITTANCE',
}

export enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  COD = 'COD',
  CARD = 'CARD',
  WALLET = 'WALLET',
  CHEQUE = 'CHEQUE',
}

export enum CodRemittanceStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  RECONCILED = 'RECONCILED',
  DISPUTED = 'DISPUTED',
}

// Default account codes for auto-entry generation
export const DEFAULT_ACCOUNT_CODES = {
  CASH: '1000',
  BANK: '1010',
  ACCOUNTS_RECEIVABLE: '1200',
  INVENTORY: '1300',
  ACCOUNTS_PAYABLE: '2000',
  SALES_TAX_PAYABLE: '2100',
  SALES_REVENUE: '4000',
  SHIPPING_REVENUE: '4100',
  SALES_RETURNS: '4200',
  COGS: '5000',
  SHIPPING_EXPENSE: '5100',
  COURIER_CHARGES: '5200',
};

export interface JournalEntryLineData {
  accountId: number;
  debit: number;
  credit: number;
  memo?: string;
}

export interface CreateJournalEntryData {
  date: Date;
  description: string;
  referenceType?: JournalReferenceType;
  referenceId?: number;
  lines: JournalEntryLineData[];
  userId?: number;
}
