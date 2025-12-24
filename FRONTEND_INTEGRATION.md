# Frontend Integration Documentation

> **Complete API Documentation for Accounting, Inventory, Billing, and Reporting Modules**
>
> Target Stack: React + TypeScript + TanStack Query v5 + React Hook Form

---

## Table of Contents

1. [Authentication & Authorization](#1-authentication--authorization)
2. [Common Patterns](#2-common-patterns)
3. [Inventory Module](#3-inventory-module)
4. [Accounting Module](#4-accounting-module)
5. [Billing Module](#5-billing-module)
6. [Reporting Module](#6-reporting-module)
7. [TypeScript Interfaces](#7-typescript-interfaces)
8. [Error Handling Contract](#8-error-handling-contract)
9. [State Management Notes](#9-state-management-notes)
10. [Performance & UX Notes](#10-performance--ux-notes)
11. [Questions & Gaps](#11-questions--gaps)

---

## 1. Authentication & Authorization

### JWT Authentication

All API endpoints (except webhooks) require JWT authentication.

**Headers Required:**
```typescript
{
  'Authorization': 'Bearer <jwt_token>',
  'Content-Type': 'application/json'
}
```

**JWT Payload Shape:**
```typescript
interface JwtTokenPayload {
  id: number; // User ID
}
```

**Token Behavior:**
- Token must be included in every request
- 401 Unauthorized returned if token is missing or invalid
- Token extraction: `Authorization` header → `Bearer <token>` format

**Error Responses:**
| Error | Code | Message |
|-------|------|---------|
| Missing token | 401 | `"Token not present"` |
| Invalid token | 401 | `"Invalid token"` |
| Expired token | 401 | `"jwt expired"` |

### Multi-Tenant Resolution

- Tenant is resolved from subdomain: `{tenant}.yourdomain.com`
- Each tenant has isolated database
- Tenant context is automatically injected server-side

---

## 2. Common Patterns

### Base URL
```
/api/v1
```

### Pagination (POST endpoints)
```typescript
interface PaginationBodyDto {
  skip?: number;  // Default: 0
  take?: number;  // Default: 100
}
```

### Date Format
- All dates use ISO 8601 string format: `"2024-01-15"` or `"2024-01-15T10:30:00.000Z"`
- Query params: `fromDate`, `toDate`, `asOfDate`
- Request body: `@IsDateString()` validated fields

### Response Wrapper Pattern
Most list endpoints return:
```typescript
{
  data: T[],
  meta?: {
    total: number,
    skip: number,
    take: number
  }
}
```

Single item endpoints return:
```typescript
{
  data: T
}
```

---

## 3. Inventory Module

### 3.1 API Endpoints

#### Locations (Warehouses)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/location` | List all locations | JWT |
| GET | `/inventory/location/default` | Get default location | JWT |
| GET | `/inventory/location/:id` | Get location by ID | JWT |
| POST | `/inventory/location/create` | Create location | JWT |
| PATCH | `/inventory/location/:id` | Update location | JWT |
| PATCH | `/inventory/location/:id/set-default` | Set as default | JWT |
| DELETE | `/inventory/location/:id` | Delete location | JWT |

**CreateLocationDto:**
```typescript
{
  name: string;           // Required
  address?: string;       // Optional
  isDefault?: boolean;    // Default: false
}
```

**UpdateLocationDto:**
```typescript
{
  name?: string;
  address?: string;
  isDefault?: boolean;
  active?: boolean;
}
```

#### Suppliers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/supplier` | List all suppliers | JWT |
| GET | `/inventory/supplier/:id` | Get supplier by ID | JWT |
| POST | `/inventory/supplier/create` | Create supplier | JWT |
| PATCH | `/inventory/supplier/:id` | Update supplier | JWT |
| DELETE | `/inventory/supplier/:id` | Delete supplier | JWT |

**CreateSupplierDto:**
```typescript
{
  name: string;           // Required
  contactName?: string;
  email?: string;         // Must be valid email
  phone?: string;
  address?: string;
}
```

#### Inventory Items

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/items` | List inventory items | JWT |
| GET | `/inventory/items/low-stock` | Get items below reorder point | JWT |
| GET | `/inventory/items/:id` | Get inventory item | JWT |
| POST | `/inventory/items/create` | Create inventory item | JWT |
| PATCH | `/inventory/items/:id` | Update inventory item | JWT |
| GET | `/inventory/stock/:productId` | Get stock level for product | JWT |

**Query Params (GET /inventory/items):**
```typescript
{
  locationId?: number;
  productId?: number;
  lowStockOnly?: boolean;
}
```

**CreateInventoryItemDto:**
```typescript
{
  productId: number;        // Required - FK to Product
  locationId?: number;      // Optional - FK to Location
  quantity?: number;        // Default: 0, Min: 0
  reorderPoint?: number;    // Min: 0
  reorderQuantity?: number; // Min: 0
  costPrice?: number;
}
```

**Stock Level Response:**
```typescript
interface StockLevel {
  productId: number;
  productName: string;
  sku: string;
  locationId?: number;
  locationName?: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;  // = quantity - reservedQuantity
  reorderPoint?: number;
  costPrice?: number;
}
```

#### Stock Operations

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/inventory/reserve` | Reserve stock (order confirmed) | JWT |
| POST | `/inventory/release` | Release reservation (order cancelled) | JWT |
| POST | `/inventory/deduct` | Deduct stock (order packed/shipped) | JWT |
| POST | `/inventory/restock` | Restock from return | JWT |
| POST | `/inventory/adjust` | Manual stock adjustment | JWT |

**ReserveStockDto / DeductStockDto / ReleaseReservationDto:**
```typescript
{
  productId: number;     // Required
  quantity: number;      // Required, Min: 1
  locationId?: number;
  orderId?: number;
}
```

**RestockDto:**
```typescript
{
  productId: number;
  quantity: number;      // Min: 1
  locationId?: number;
  orderId?: number;
  reason?: string;
}
```

**AdjustStockDto:**
```typescript
{
  productId: number;
  quantity: number;      // Positive to add, negative to subtract
  reason: string;        // Required - explanation for adjustment
  locationId?: number;
}
```

#### Stock Movements (Audit Trail)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/movements` | List all movements | JWT |
| GET | `/inventory/movements/order/:orderId` | Get movements by order | JWT |
| GET | `/inventory/movements/item/:inventoryItemId` | Get movements by item | JWT |

**MovementQueryDto:**
```typescript
{
  productId?: number;
  orderId?: number;
  fromDate?: string;    // ISO date
  toDate?: string;
  limit?: number;
  offset?: number;
}
```

#### Purchase Orders

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/purchase-order` | List POs | JWT |
| GET | `/inventory/purchase-order/:id` | Get PO by ID | JWT |
| POST | `/inventory/purchase-order/create` | Create PO | JWT |
| PATCH | `/inventory/purchase-order/:id` | Update PO | JWT |
| PATCH | `/inventory/purchase-order/:id/order` | Mark as ordered | JWT |
| POST | `/inventory/purchase-order/:id/receive` | Receive items | JWT |
| PATCH | `/inventory/purchase-order/:id/cancel` | Cancel PO | JWT |
| DELETE | `/inventory/purchase-order/:id` | Delete PO | JWT |

**CreatePurchaseOrderDto:**
```typescript
{
  supplierId?: number;
  orderDate?: string;       // ISO date
  expectedDate?: string;
  notes?: string;
  items: PurchaseOrderItemDto[];  // Required, min 1 item
}

interface PurchaseOrderItemDto {
  productId: number;
  orderedQuantity: number;  // Min: 1
  unitCost: number;         // Min: 0
  locationId?: number;
}
```

**ReceivePurchaseOrderDto:**
```typescript
{
  items: ReceiveItemDto[];
}

interface ReceiveItemDto {
  purchaseOrderItemId: number;
  receivedQuantity: number;  // Min: 1
}
```

#### Stock Transfers

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/inventory/transfer` | List transfers | JWT |
| GET | `/inventory/transfer/:id` | Get transfer by ID | JWT |
| POST | `/inventory/transfer/create` | Create transfer | JWT |
| PATCH | `/inventory/transfer/:id/in-transit` | Mark in transit | JWT |
| PATCH | `/inventory/transfer/:id/complete` | Complete transfer | JWT |
| PATCH | `/inventory/transfer/:id/cancel` | Cancel transfer | JWT |
| DELETE | `/inventory/transfer/:id` | Delete transfer | JWT |

**CreateTransferDto:**
```typescript
{
  fromLocationId: number;  // Required
  toLocationId: number;    // Required
  notes?: string;
  items: TransferItemDto[];  // Required
}

interface TransferItemDto {
  productId: number;
  quantity: number;  // Min: 1
}
```

### 3.2 Data Models

#### InventoryLocation
```typescript
interface InventoryLocation {
  id: number;
  name: string;
  address: string | null;
  isDefault: boolean;
  active: boolean;
}
```

#### InventoryItem
```typescript
interface InventoryItem {
  id: number;
  quantity: number;
  reservedQuantity: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  costPrice: number | null;
  productId: number;
  locationId: number | null;
  updatedAt: string;
  // Relations
  product?: Product;
  location?: InventoryLocation;
}
```

#### InventoryMovement
```typescript
interface InventoryMovement {
  id: number;
  type: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  referenceType: ReferenceType | null;
  referenceId: number | null;
  costAtTime: number | null;
  createdAt: string;
  inventoryItemId: number;
  userId: number | null;
}
```

### 3.3 Enums

```typescript
enum MovementType {
  SALE = 'SALE',
  RETURN = 'RETURN',
  ADJUSTMENT = 'ADJUSTMENT',
  PURCHASE = 'PURCHASE',
  TRANSFER_IN = 'TRANSFER_IN',
  TRANSFER_OUT = 'TRANSFER_OUT',
  RESERVATION = 'RESERVATION',
  RESERVATION_RELEASE = 'RESERVATION_RELEASE',
  DAMAGED = 'DAMAGED',
  EXPIRED = 'EXPIRED',
}

enum ReferenceType {
  ORDER = 'ORDER',
  PURCHASE_ORDER = 'PURCHASE_ORDER',
  TRANSFER = 'TRANSFER',
  MANUAL = 'MANUAL',
}

enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIAL = 'PARTIAL',
  RECEIVED = 'RECEIVED',
  CANCELLED = 'CANCELLED',
}

enum TransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}
```

### 3.4 UI Mapping Guidance

| Screen | API Calls | User Flow |
|--------|-----------|-----------|
| **Locations List** | GET `/inventory/location` | View all warehouses, set default |
| **Location Form** | POST/PATCH `/inventory/location` | Create/edit warehouse |
| **Suppliers List** | GET `/inventory/supplier` | View vendor list |
| **Supplier Form** | POST/PATCH `/inventory/supplier` | Create/edit vendor |
| **Inventory Dashboard** | GET `/inventory/items`, GET `/inventory/items/low-stock` | Overview of stock levels |
| **Product Stock Card** | GET `/inventory/stock/:productId` | View stock per product |
| **Stock Adjustment** | POST `/inventory/adjust` | Manual correction with reason |
| **Movement History** | GET `/inventory/movements` | Audit trail view |
| **PO List** | GET `/inventory/purchase-order` | View all purchase orders |
| **PO Detail** | GET `/inventory/purchase-order/:id` | View PO with line items |
| **PO Create** | POST `/inventory/purchase-order/create` | Multi-item form |
| **PO Receive** | POST `/inventory/purchase-order/:id/receive` | Receive goods UI |
| **Transfer List** | GET `/inventory/transfer` | Inter-warehouse transfers |
| **Transfer Workflow** | POST create → PATCH in-transit → PATCH complete | Transfer lifecycle |

### 3.5 Business Logic Flow

```
Order Confirmed   → POST /inventory/reserve     (reservedQty += qty)
Order Packed      → POST /inventory/deduct      (qty -= qty, reservedQty -= qty)
Order Cancelled   → POST /inventory/release     (reservedQty -= qty)
Return + Restock  → POST /inventory/restock     (qty += qty)
```

### 3.6 Validation Constraints

| Field | Constraint |
|-------|------------|
| `quantity` (operations) | Min: 1 |
| `quantity` (items) | Min: 0 |
| `reorderPoint` | Min: 0 |
| `unitCost` | Min: 0 |
| `costPrice` | Min: 0 |
| `productId + locationId` | Unique combination |

---

## 4. Accounting Module

### 4.1 API Endpoints

#### Chart of Accounts

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/account` | List accounts | JWT |
| GET | `/accounting/account/initialize` | Create default accounts | JWT |
| GET | `/accounting/account/:id` | Get account by ID | JWT |
| GET | `/accounting/account/:id/balance` | Get account balance | JWT |
| POST | `/accounting/account/create` | Create account | JWT |
| PATCH | `/accounting/account/:id` | Update account | JWT |
| DELETE | `/accounting/account/:id` | Delete account | JWT |

**AccountQueryDto:**
```typescript
{
  type?: AccountType;      // Filter by type
  activeOnly?: boolean;    // Only active accounts
}
```

**CreateAccountDto:**
```typescript
{
  code: string;            // Required, unique (e.g., "1000")
  name: string;            // Required
  type: AccountType;       // Required
  subType?: AccountSubType;
  description?: string;
  parentId?: number;       // For account hierarchy
}
```

**Balance Query Params:**
```
/accounting/account/:id/balance?fromDate=2024-01-01&toDate=2024-12-31
```

#### Fiscal Periods

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/fiscal-period` | List all periods | JWT |
| GET | `/accounting/fiscal-period/current` | Get current open period | JWT |
| GET | `/accounting/fiscal-period/:id` | Get period by ID | JWT |
| POST | `/accounting/fiscal-period/create` | Create period | JWT |
| PATCH | `/accounting/fiscal-period/:id` | Update period | JWT |
| PATCH | `/accounting/fiscal-period/:id/close` | Close period | JWT |
| PATCH | `/accounting/fiscal-period/:id/reopen` | Reopen period | JWT |

**CreateFiscalPeriodDto:**
```typescript
{
  name: string;        // e.g., "2024-Q1", "Jan 2024"
  startDate: string;   // ISO date
  endDate: string;     // ISO date
}
```

#### Journal Entries

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/journal` | List journal entries | JWT |
| GET | `/accounting/journal/trial-balance` | Get trial balance | JWT |
| GET | `/accounting/journal/ledger/:accountId` | Get account ledger | JWT |
| GET | `/accounting/journal/:id` | Get entry by ID | JWT |
| POST | `/accounting/journal/create` | Create journal entry | JWT |
| PATCH | `/accounting/journal/:id/post` | Post entry | JWT |
| PATCH | `/accounting/journal/:id/reverse` | Reverse entry | JWT |
| DELETE | `/accounting/journal/:id` | Delete draft entry | JWT |

**JournalQueryDto:**
```typescript
{
  fromDate?: string;
  toDate?: string;
  accountId?: number;
  referenceType?: JournalReferenceType;
  limit?: number;
  offset?: number;
}
```

**CreateJournalEntryDto:**
```typescript
{
  date: string;                        // Required, ISO date
  description?: string;
  referenceType?: JournalReferenceType;
  referenceId?: number;
  lines: JournalEntryLineDto[];        // Required, min 2 lines
}

interface JournalEntryLineDto {
  accountId: number;     // Required
  debit: number;         // Min: 0
  credit: number;        // Min: 0
  memo?: string;
}
```

**Validation Rule:** Total debits MUST equal total credits.

#### Invoices (Customer)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/invoice` | List invoices | JWT |
| GET | `/accounting/invoice/:id` | Get invoice by ID | JWT |
| POST | `/accounting/invoice/create` | Create invoice | JWT |
| POST | `/accounting/invoice/from-order/:orderId` | Create from order | JWT |
| PATCH | `/accounting/invoice/:id` | Update invoice | JWT |
| PATCH | `/accounting/invoice/:id/send` | Mark as sent | JWT |
| PATCH | `/accounting/invoice/:id/cancel` | Cancel invoice | JWT |
| DELETE | `/accounting/invoice/:id` | Delete draft invoice | JWT |

**InvoiceQueryDto:**
```typescript
{
  status?: InvoiceStatus;
  customerId?: number;
  fromDate?: string;
  toDate?: string;
}
```

**CreateInvoiceDto:**
```typescript
{
  customerId?: number;
  orderId?: number;
  issueDate: string;       // Required
  dueDate?: string;
  notes?: string;
  items: InvoiceItemDto[];  // Required
}

interface InvoiceItemDto {
  description: string;     // Required
  quantity: number;        // Min: 0
  unitPrice: number;       // Min: 0
  taxRate?: number;        // Min: 0, percentage
  productId?: number;
}
```

#### Bills (Vendor)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/bill` | List bills | JWT |
| GET | `/accounting/bill/:id` | Get bill by ID | JWT |
| POST | `/accounting/bill/create` | Create bill | JWT |
| POST | `/accounting/bill/from-purchase-order/:purchaseOrderId` | Create from PO | JWT |
| PATCH | `/accounting/bill/:id` | Update bill | JWT |
| DELETE | `/accounting/bill/:id` | Delete bill | JWT |

**BillQueryDto:**
```typescript
{
  status?: BillStatus;
  supplierId?: number;
  fromDate?: string;
  toDate?: string;
}
```

**CreateBillDto:**
```typescript
{
  supplierId?: number;
  purchaseOrderId?: number;
  issueDate: string;
  dueDate?: string;
  notes?: string;
  items: BillItemDto[];
}

interface BillItemDto {
  description: string;
  quantity: number;
  unitPrice: number;
  accountId?: number;  // Expense account
}
```

#### Payments

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/payment` | List payments | JWT |
| GET | `/accounting/payment/summary` | Get payment summary | JWT |
| GET | `/accounting/payment/invoice/:invoiceId` | Payments for invoice | JWT |
| GET | `/accounting/payment/bill/:billId` | Payments for bill | JWT |
| GET | `/accounting/payment/order/:orderId` | Payments for order | JWT |
| GET | `/accounting/payment/:id` | Get payment by ID | JWT |
| POST | `/accounting/payment/create` | Create payment | JWT |

**PaymentQueryDto:**
```typescript
{
  type?: PaymentType;
  fromDate?: string;
  toDate?: string;
}
```

**CreatePaymentDto:**
```typescript
{
  type: PaymentType;       // Required
  method: PaymentMethod;   // Required
  amount: number;          // Required, Min: 0
  date: string;            // Required
  invoiceId?: number;
  billId?: number;
  orderId?: number;
  bankAccount?: string;
  transactionRef?: string;
  notes?: string;
}
```

#### COD Remittance

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/cod-remittance` | List remittances | JWT |
| GET | `/accounting/cod-remittance/summary` | Get summary | JWT |
| GET | `/accounting/cod-remittance/order/:orderId` | Get by order | JWT |
| GET | `/accounting/cod-remittance/:id` | Get by ID | JWT |
| POST | `/accounting/cod-remittance/create` | Create remittance | JWT |
| PATCH | `/accounting/cod-remittance/:id/status` | Update status | JWT |
| DELETE | `/accounting/cod-remittance/:id` | Delete remittance | JWT |

**CodRemittanceQueryDto:**
```typescript
{
  status?: CodRemittanceStatus;
  courierServiceId?: number;
  fromDate?: string;
  toDate?: string;
}
```

**CreateCodRemittanceDto:**
```typescript
{
  courierServiceId: number;   // Required
  statementDate: string;      // Required
  bankReference?: string;
  notes?: string;
  items: CodRemittanceItemDto[];  // Required
}

interface CodRemittanceItemDto {
  orderId: number;
  cn: string;              // Consignment number
  amount: number;          // Min: 0
  courierCharge: number;   // Min: 0
}
```

#### Tax Rates

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/accounting/tax-rate` | List tax rates | JWT |
| GET | `/accounting/tax-rate/:id` | Get tax rate | JWT |
| POST | `/accounting/tax-rate/create` | Create tax rate | JWT |
| PATCH | `/accounting/tax-rate/:id` | Update tax rate | JWT |
| DELETE | `/accounting/tax-rate/:id` | Delete tax rate | JWT |
| GET | `/accounting/tax-rate/calculate/:amount/:taxRateId` | Calculate tax | JWT |

**CreateTaxRateDto:**
```typescript
{
  name: string;        // Required
  rate: number;        // Required, Min: 0, percentage value
  accountId?: number;  // Tax liability account
}
```

### 4.2 Enums

```typescript
enum AccountType {
  ASSET = 'ASSET',
  LIABILITY = 'LIABILITY',
  EQUITY = 'EQUITY',
  REVENUE = 'REVENUE',
  EXPENSE = 'EXPENSE',
}

enum AccountSubType {
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

enum JournalEntryStatus {
  DRAFT = 'DRAFT',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

enum JournalReferenceType {
  ORDER = 'ORDER',
  PAYMENT = 'PAYMENT',
  REFUND = 'REFUND',
  PURCHASE = 'PURCHASE',
  ADJUSTMENT = 'ADJUSTMENT',
  COD_REMITTANCE = 'COD_REMITTANCE',
}

enum FiscalPeriodStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

enum BillStatus {
  DRAFT = 'DRAFT',
  PENDING = 'PENDING',
  PARTIAL = 'PARTIAL',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

enum PaymentType {
  RECEIPT = 'RECEIPT',
  DISBURSEMENT = 'DISBURSEMENT',
  REFUND = 'REFUND',
  COD_REMITTANCE = 'COD_REMITTANCE',
}

enum PaymentMethod {
  CASH = 'CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  COD = 'COD',
  CARD = 'CARD',
  WALLET = 'WALLET',
  CHEQUE = 'CHEQUE',
}

enum CodRemittanceStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  RECONCILED = 'RECONCILED',
  DISPUTED = 'DISPUTED',
}
```

### 4.3 Default Account Codes

```typescript
const DEFAULT_ACCOUNT_CODES = {
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
```

### 4.4 UI Mapping Guidance

| Screen | API Calls | User Flow |
|--------|-----------|-----------|
| **Chart of Accounts** | GET `/accounting/account` | Tree view of accounts |
| **Account Setup** | GET `/accounting/account/initialize` | One-time setup |
| **Account Balance** | GET `/accounting/account/:id/balance` | Balance with date range |
| **Fiscal Periods** | GET `/accounting/fiscal-period` | Period management |
| **Journal Entry Form** | POST `/accounting/journal/create` | Debit/Credit lines |
| **Trial Balance** | GET `/accounting/journal/trial-balance` | Financial report |
| **General Ledger** | GET `/accounting/journal/ledger/:accountId` | Account history |
| **Invoice List** | GET `/accounting/invoice` | AR management |
| **Invoice Detail** | GET `/accounting/invoice/:id` | View/print invoice |
| **Create Invoice** | POST `/accounting/invoice/create` | Multi-line form |
| **Bill List** | GET `/accounting/bill` | AP management |
| **Payment Recording** | POST `/accounting/payment/create` | Record payment |
| **COD Reconciliation** | GET/POST `/accounting/cod-remittance` | Courier settlements |

### 4.5 Validation Constraints

| Rule | Description |
|------|-------------|
| Journal Entry Balance | `sum(debits) === sum(credits)` |
| Journal Min Lines | At least 2 lines required |
| Account Code | Must be unique |
| Fiscal Period | No overlapping dates |
| Delete Journal | Only DRAFT status allowed |
| Delete Invoice | Only DRAFT status allowed |

---

## 5. Billing Module

### 5.1 API Endpoints

#### Tenant Billing (User)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/billing/balance` | Get current balance | JWT |
| POST | `/billing/transactions` | List transactions | JWT |
| GET | `/billing/bank-details` | Get bank details for transfer | JWT |

**Balance Response:**
```typescript
{
  data: {
    currentBalance: number;
    negativeLimit: number;
    isBlocked: boolean;
    totalCredits: number;
    totalDebits: number;
  }
}
```

**ListTransactionsDto:**
```typescript
{
  skip?: number;
  take?: number;
  type?: TransactionType;
  reason?: string;
  paymentMethod?: PaymentMethod;
  tenantId?: string;  // Admin only
}
```

#### Recharge

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/billing/recharge/initiate` | Initiate payment | JWT |
| POST | `/billing/recharge/bank-transfer` | Submit bank transfer | JWT |
| POST | `/billing/recharge/upload-url` | Get S3 upload URL | JWT |

**InitiateRechargeDto:**
```typescript
{
  amount: number;           // Required, Min: 1
  paymentMethod: PaymentMethod;  // Required
  customerEmail?: string;
  customerPhone?: string;
}
```

**BankTransferRechargeDto:**
```typescript
{
  amount: number;           // Required, Min: 1
  screenshotKey: string;    // Required - S3 key from upload
  notes?: string;
}
```

**Initiate Response (for payment gateways):**
```typescript
{
  success: boolean;
  paymentRequestId: string;
  redirectUrl?: string;     // Redirect to payment gateway
  // OR HTML form returned directly for some gateways
}
```

#### Admin Billing

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/admin/billing/list` | List all tenant billings | JWT (Admin) |
| GET | `/admin/billing/:tenantId` | Get tenant billing | JWT (Admin) |
| PATCH | `/admin/billing/:tenantId/limit` | Update negative limit | JWT (Admin) |
| POST | `/admin/billing/manual-credit` | Add manual credit | JWT (Admin) |
| POST | `/admin/billing/payment-requests` | List payment requests | JWT (Admin) |
| POST | `/admin/billing/bank-transfers` | List bank transfers | JWT (Admin) |
| PATCH | `/admin/billing/bank-transfer/:id/approve` | Approve transfer | JWT (Admin) |
| PATCH | `/admin/billing/bank-transfer/:id/reject` | Reject transfer | JWT (Admin) |
| GET | `/admin/billing/bank-details/all` | Get all bank details | JWT (Admin) |
| POST | `/admin/billing/bank-details` | Create bank detail | JWT (Admin) |
| PATCH | `/admin/billing/bank-details/:id` | Update bank detail | JWT (Admin) |

**ListBillingsDto:**
```typescript
{
  skip?: number;
  take?: number;
  tenantId?: string;
  isBlocked?: boolean;
}
```

**ManualCreditDto:**
```typescript
{
  tenantId: string;    // Required
  amount: number;      // Required, Min: 1
  reason: string;      // Required
}
```

**UpdateNegativeLimitDto:**
```typescript
{
  negativeLimit: number;  // Required (e.g., -5000)
}
```

**CreateBankDetailDto:**
```typescript
{
  bankName: string;       // Required
  accountName: string;    // Required
  accountNumber: string;  // Required
  iban?: string;
  branchCode?: string;
  branchName?: string;
}
```

### 5.2 Enums

```typescript
enum TransactionType {
  credit = 'credit',
  debit = 'debit',
}

enum TransactionReason {
  order_charge = 'order_charge',
  recharge = 'recharge',
  manual_adjustment = 'manual_adjustment',
  refund = 'refund',
}

enum PaymentMethod {
  bank_transfer = 'bank_transfer',
  alfapay = 'alfapay',
  jazzcash = 'jazzcash',
  easypaisa = 'easypaisa',
}

enum PaymentStatus {
  pending = 'pending',
  processing = 'processing',
  completed = 'completed',
  failed = 'failed',
  cancelled = 'cancelled',
}
```

### 5.3 UI Mapping Guidance

| Screen | API Calls | User Flow |
|--------|-----------|-----------|
| **Billing Dashboard** | GET `/billing/balance` | View balance, limits |
| **Transaction History** | POST `/billing/transactions` | Paginated list |
| **Recharge Modal** | POST `/billing/recharge/initiate` | Select method, enter amount |
| **Bank Transfer Flow** | POST upload-url → upload to S3 → POST bank-transfer | Manual recharge |
| **Admin: Tenant List** | POST `/admin/billing/list` | View all tenants |
| **Admin: Approve Transfer** | PATCH approve/reject | Review screenshot |

### 5.4 Credit Balance Guard

The system has a `CreditBalanceGuard` that blocks certain operations when balance is low:
- Checked before order booking operations
- Can be bypassed with `@BypassCreditCheck()` decorator (billing endpoints)
- Check: `currentBalance >= negativeLimit`

---

## 6. Reporting Module

### 6.1 API Endpoints

All reporting endpoints use **POST** method with filter body.

#### Order Reports

| Endpoint | Description |
|----------|-------------|
| POST `/reports/orders/agent-order` | Orders per user/agent |
| POST `/reports/orders/product-unit` | Units per product |
| POST `/reports/orders/booking-unit` | Booking status per product |
| POST `/reports/orders/foc-unit` | Free items (unitPrice=0) |
| POST `/reports/orders/agent-channel` | Per channel + agent |
| POST `/reports/orders/channel-order` | Orders per channel |
| POST `/reports/orders/user-incentive` | Incentive calculations |
| POST `/reports/orders/courier-delivery` | Delivery stats per courier |
| POST `/reports/orders/courier-dispatch` | Dispatch counts |
| POST `/reports/orders/channel-order-generation` | Webhook-based generation |
| POST `/reports/orders/booked-product-value` | Booked order values |

#### Inventory Reports

| Endpoint | Description |
|----------|-------------|
| POST `/reports/inventory/stock` | Current stock levels |
| POST `/reports/inventory/stock-damaged` | Damaged stock |
| POST `/reports/inventory/stock-expired` | Expired stock |
| POST `/reports/inventory/stock-movement` | Movement history |
| POST `/reports/inventory/low-stock` | Below reorder point |
| POST `/reports/inventory/purchase-order` | PO summary |

#### Accounting Reports

| Endpoint | Description |
|----------|-------------|
| POST `/reports/accounting/revenue` | Revenue by period |
| POST `/reports/accounting/invoice-aging` | AR aging buckets |
| POST `/reports/accounting/cod-remittance` | COD by courier |
| POST `/reports/accounting/payment` | Payment transactions |
| POST `/reports/accounting/profit-summary` | P&L summary |

### 6.2 Filter DTOs

**BaseReportFilterDto:**
```typescript
{
  brandId?: number;
  channelId?: number;
  dateRange?: {
    start?: string;  // ISO datetime
    end?: string;
  };
  city?: string;
  courierServiceId?: number;
  status?: string[];
}
```

**InventoryReportFilterDto:**
```typescript
{
  locationId?: number;
  productId?: number;
  categoryId?: number;
  brandId?: number;
  sku?: string;
  productName?: string;
}
```

**StockMovementReportFilterDto:**
```typescript
{
  ...InventoryReportFilterDto,
  dateRange?: DateRangeDto;
  movementTypes?: string[];  // MovementType values
  userId?: number;
}
```

**RevenueReportFilterDto:**
```typescript
{
  dateRange?: DateRangeDto;
  groupBy?: 'day' | 'week' | 'month' | 'quarter' | 'year';
  brandId?: number;
  channelId?: number;
  status?: string[];
}
```

**InvoiceAgingFilterDto:**
```typescript
{
  asOfDate?: string;
  customerId?: number;
  agingBuckets?: number[];  // e.g., [30, 60, 90, 120]
}
```

**ProfitSummaryFilterDto:**
```typescript
{
  dateRange?: DateRangeDto;
  brandId?: number;
  channelId?: number;
  groupBy?: 'day' | 'week' | 'month';
}
```

### 6.3 Response Types

**Generic Report Response:**
```typescript
interface ReportResponse<T> {
  data: T[];
  meta: {
    total: number;
    filters: Record<string, any>;
    generatedAt: string;
  };
}
```

**Key Report Row Types:**

```typescript
// Stock Report
interface StockReportRow {
  productId: number;
  productName: string;
  sku: string;
  locationId: number | null;
  locationName: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number | null;
  costPrice: number | null;
  stockValue: number;
}

// Low Stock Report
interface LowStockReportRow {
  productId: number;
  productName: string;
  sku: string;
  locationId: number | null;
  locationName: string | null;
  currentQuantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  reorderPoint: number;
  reorderQuantity: number | null;
  suggestedOrderQuantity: number;
}

// Revenue Report
interface RevenueReportRow {
  period: string;
  grossRevenue: number;
  discounts: number;
  shippingCharges: number;
  taxes: number;
  netRevenue: number;
  orderCount: number;
}

// Profit Summary
interface ProfitSummaryReportRow {
  period: string;
  grossRevenue: number;
  cogs: number;
  grossProfit: number;
  shippingIncome: number;
  courierCosts: number;
  netProfit: number;
  profitMargin: number;  // percentage
}

// Invoice Aging
interface InvoiceAgingReportRow {
  customerId: number;
  customerName: string;
  currentAmount: number;
  bucket30: number;
  bucket60: number;
  bucket90: number;
  bucket120Plus: number;
  totalOutstanding: number;
  invoices: {
    invoiceNumber: string;
    issueDate: string;
    dueDate: string;
    totalAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    daysOverdue: number;
  }[];
}
```

### 6.4 UI Mapping Guidance

| Screen | Endpoint | Notes |
|--------|----------|-------|
| **Stock Overview** | POST `/reports/inventory/stock` | Filterable table |
| **Low Stock Alerts** | POST `/reports/inventory/low-stock` | Reorder suggestions |
| **Movement Audit** | POST `/reports/inventory/stock-movement` | Filter by type |
| **Revenue Dashboard** | POST `/reports/accounting/revenue` | Chart with groupBy |
| **AR Aging** | POST `/reports/accounting/invoice-aging` | Aging buckets |
| **P&L Summary** | POST `/reports/accounting/profit-summary` | Margin calculations |
| **COD Reconciliation** | POST `/reports/accounting/cod-remittance` | Per courier stats |
| **Agent Performance** | POST `/reports/orders/agent-order` | KPI dashboard |
| **Product Analysis** | POST `/reports/orders/product-unit` | Best sellers |

---

## 7. TypeScript Interfaces

### Complete Type Definitions

```typescript
// ============ Common ============

interface PaginationParams {
  skip?: number;
  take?: number;
}

interface DateRangeDto {
  start?: string;
  end?: string;
}

interface ApiResponse<T> {
  data: T;
  message?: string;
}

interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    skip: number;
    take: number;
  };
}

// ============ Inventory ============

interface InventoryLocation {
  id: number;
  name: string;
  address: string | null;
  isDefault: boolean;
  active: boolean;
}

interface Supplier {
  id: number;
  name: string;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
}

interface InventoryItem {
  id: number;
  quantity: number;
  reservedQuantity: number;
  reorderPoint: number | null;
  reorderQuantity: number | null;
  costPrice: number | null;
  productId: number;
  locationId: number | null;
  updatedAt: string;
  product?: Product;
  location?: InventoryLocation;
}

interface InventoryMovement {
  id: number;
  type: MovementType;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  referenceType: ReferenceType | null;
  referenceId: number | null;
  costAtTime: number | null;
  createdAt: string;
  inventoryItemId: number;
  userId: number | null;
  user?: { id: number; name: string };
}

interface PurchaseOrder {
  id: number;
  poNumber: string;
  status: PurchaseOrderStatus;
  orderDate: string | null;
  expectedDate: string | null;
  receivedDate: string | null;
  totalAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplierId: number | null;
  userId: number | null;
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

interface PurchaseOrderItem {
  id: number;
  orderedQuantity: number;
  receivedQuantity: number;
  unitCost: number;
  purchaseOrderId: number;
  productId: number;
  locationId: number | null;
  product?: Product;
  location?: InventoryLocation;
}

interface StockTransfer {
  id: number;
  transferNumber: string;
  status: TransferStatus;
  notes: string | null;
  initiatedAt: string;
  completedAt: string | null;
  fromLocationId: number;
  toLocationId: number;
  userId: number | null;
  fromLocation?: InventoryLocation;
  toLocation?: InventoryLocation;
  items?: StockTransferItem[];
}

interface StockTransferItem {
  id: number;
  quantity: number;
  stockTransferId: number;
  productId: number;
  product?: Product;
}

// ============ Accounting ============

interface Account {
  id: number;
  code: string;
  name: string;
  type: AccountType;
  subType: AccountSubType | null;
  description: string | null;
  isSystemAccount: boolean;
  active: boolean;
  parentId: number | null;
  parent?: Account;
  children?: Account[];
}

interface FiscalPeriod {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  status: FiscalPeriodStatus;
  closedAt: string | null;
}

interface JournalEntry {
  id: number;
  entryNumber: string;
  date: string;
  description: string | null;
  referenceType: JournalReferenceType | null;
  referenceId: number | null;
  status: JournalEntryStatus;
  createdAt: string;
  postedAt: string | null;
  fiscalPeriodId: number | null;
  reversedEntryId: number | null;
  userId: number | null;
  lines?: JournalEntryLine[];
}

interface JournalEntryLine {
  id: number;
  debit: number;
  credit: number;
  memo: string | null;
  journalEntryId: number;
  accountId: number;
  account?: Account;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: InvoiceStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customerId: number | null;
  orderId: number | null;
  customer?: Customer;
  items?: InvoiceItem[];
}

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  invoiceId: number;
  productId: number | null;
  product?: Product;
}

interface Bill {
  id: number;
  billNumber: string;
  issueDate: string;
  dueDate: string | null;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount: number;
  status: BillStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  supplierId: number | null;
  purchaseOrderId: number | null;
  supplier?: Supplier;
  items?: BillItem[];
}

interface BillItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  billId: number;
  accountId: number | null;
  account?: Account;
}

interface PaymentRecord {
  id: number;
  paymentNumber: string;
  type: PaymentType;
  method: PaymentMethod;
  amount: number;
  date: string;
  bankAccount: string | null;
  transactionRef: string | null;
  notes: string | null;
  createdAt: string;
  invoiceId: number | null;
  billId: number | null;
  orderId: number | null;
  codRemittanceId: number | null;
  userId: number | null;
}

interface CodRemittance {
  id: number;
  remittanceNumber: string;
  statementDate: string;
  totalOrders: number;
  grossAmount: number;
  courierCharges: number;
  netAmount: number;
  status: CodRemittanceStatus;
  receivedDate: string | null;
  bankReference: string | null;
  notes: string | null;
  createdAt: string;
  courierServiceId: number;
  userId: number | null;
  items?: CodRemittanceItem[];
}

interface CodRemittanceItem {
  id: number;
  cn: string;
  amount: number;
  courierCharge: number;
  codRemittanceId: number;
  orderId: number;
}

interface TaxRate {
  id: number;
  name: string;
  rate: number;
  active: boolean;
  accountId: number | null;
}

// ============ Billing ============

interface TenantBilling {
  id: string;
  tenantId: string;
  currentBalance: number;
  negativeLimit: number;
  totalCredits: number;
  totalDebits: number;
  isBlocked: boolean;
  createdAt: string;
  updatedAt: string;
}

interface BillingTransaction {
  id: string;
  tenantId: string;
  type: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  reason: string;
  referenceType: string | null;
  referenceId: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

interface PaymentRequest {
  id: string;
  tenantId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  gatewayRef: string | null;
  gatewayResponse: Record<string, any> | null;
  screenshotUrl: string | null;
  screenshotKey: string | null;
  adminNotes: string | null;
  processedBy: string | null;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BankDetail {
  id: string;
  bankName: string;
  accountName: string;
  accountNumber: string;
  iban: string | null;
  branchCode: string | null;
  branchName: string | null;
  isActive: boolean;
  createdAt: string;
}
```

---

## 8. Error Handling Contract

### Error Response Format

```typescript
interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error?: string;
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Validation failed |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate entry |
| 422 | Unprocessable Entity | Business rule violation |
| 500 | Internal Server Error | Server error |

### Validation Errors (400)

```typescript
{
  statusCode: 400,
  message: [
    "code must be a string",
    "name should not be empty"
  ],
  error: "Bad Request"
}
```

### Business Logic Errors

```typescript
// Insufficient stock
{
  statusCode: 400,
  message: "Insufficient available stock. Available: 5, Requested: 10"
}

// Journal entry unbalanced
{
  statusCode: 400,
  message: "Journal entry must be balanced. Debits: 1000, Credits: 900"
}

// Cannot modify posted entry
{
  statusCode: 400,
  message: "Cannot delete posted journal entry"
}

// Duplicate account code
{
  statusCode: 409,
  message: "Account with code 1000 already exists"
}
```

### Frontend Error Mapping

```typescript
const errorMessages: Record<string, string> = {
  'Insufficient available stock': 'Not enough stock available',
  'Journal entry must be balanced': 'Debits and credits must be equal',
  'Cannot delete posted journal entry': 'Posted entries cannot be deleted',
  'Account with code .* already exists': 'This account code is already in use',
  'Token not present': 'Please log in to continue',
  'Invalid token': 'Your session has expired',
};
```

---

## 9. State Management Notes

### What to Cache (TanStack Query)

| Data | Cache Time | Stale Time | Notes |
|------|------------|------------|-------|
| Locations | 10 min | 5 min | Rarely changes |
| Suppliers | 10 min | 5 min | Rarely changes |
| Accounts (Chart) | 10 min | 5 min | Setup data |
| Tax Rates | 10 min | 5 min | Config data |
| Fiscal Periods | 5 min | 2 min | May close |
| Bank Details | 10 min | 5 min | Admin config |
| Inventory Items | 2 min | 30 sec | Changes frequently |
| PO List | 2 min | 30 sec | Status changes |
| Balance | 1 min | 0 | Always refetch |
| Reports | 0 | 0 | Never cache |

### Invalidation Rules

```typescript
// After creating/updating inventory item
queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
queryClient.invalidateQueries({ queryKey: ['stock-level'] });

// After stock operation
queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
queryClient.invalidateQueries({ queryKey: ['movements'] });

// After PO receive
queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
queryClient.invalidateQueries({ queryKey: ['inventory-items'] });

// After payment
queryClient.invalidateQueries({ queryKey: ['invoices'] });
queryClient.invalidateQueries({ queryKey: ['bills'] });
queryClient.invalidateQueries({ queryKey: ['payments'] });

// After journal post
queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
queryClient.invalidateQueries({ queryKey: ['trial-balance'] });
queryClient.invalidateQueries({ queryKey: ['account-balance'] });
```

### Derived Values (Frontend Calculated)

```typescript
// Available stock
const availableStock = item.quantity - item.reservedQuantity;

// Invoice outstanding
const outstanding = invoice.totalAmount - invoice.paidAmount;

// Low stock check
const isLowStock = item.quantity <= (item.reorderPoint ?? 0);

// Journal balanced
const isBalanced =
  lines.reduce((sum, l) => sum + l.debit, 0) ===
  lines.reduce((sum, l) => sum + l.credit, 0);

// Line total
const lineTotal = quantity * unitPrice;
const lineTotalWithTax = lineTotal + (lineTotal * taxRate / 100);
```

### Optimistic Updates

**Recommended for:**
- Location/Supplier toggle active
- Invoice/Bill status changes
- Transfer status transitions

**NOT recommended for:**
- Stock operations (need server validation)
- Journal entries (balance validation)
- Payment recording (affects multiple entities)

---

## 10. Performance & UX Notes

### Expensive Endpoints

| Endpoint | Notes |
|----------|-------|
| Reports (all) | Aggregation queries - show loading |
| Trial Balance | Full account scan |
| Invoice Aging | Complex date calculations |
| Stock Movement | Large data sets |

### Debounce/Throttle Recommendations

| Action | Debounce | Notes |
|--------|----------|-------|
| Search filters | 300ms | For typeahead |
| Date range change | 500ms | Prevent multiple calls |
| Report generation | None | User-initiated |

### Batch Operations

- **PO Receive**: Single endpoint handles multiple items
- **Transfer Create**: Multiple items in one call
- **COD Remittance**: Batch order items

### Loading States

```typescript
// Show skeleton for lists
if (isLoading) return <TableSkeleton rows={10} />;

// Show spinner for single items
if (isFetching) return <Spinner />;

// Disable buttons during mutation
<Button disabled={isPending}>Save</Button>
```

### Form Optimization

- Use React Hook Form with `mode: 'onBlur'` for complex forms
- Pre-fetch dropdown data (locations, accounts, suppliers)
- Use optimistic validation for journal balance

---

## 11. Questions & Gaps

### Missing Backend Info

1. **Role-Based Access**: No RBAC decorators on accounting/inventory controllers. All endpoints accessible to any authenticated user?

2. **Soft Delete**: No soft delete on any entities. All deletes are hard deletes?

3. **Audit Trail**: Only inventory has movement tracking. No audit for accounting changes?

4. **Search/Filter**: Limited search capabilities. No full-text search on products/customers?

5. **Bulk Operations**: No bulk update/delete endpoints?

### Suggested Backend Changes

1. **Add pagination to all list endpoints**:
   - `/accounting/account` - missing pagination
   - `/accounting/tax-rate` - missing pagination
   - `/inventory/location` - missing pagination
   - `/inventory/supplier` - missing pagination

2. **Add search/filter**:
   - Invoice search by invoice number
   - Bill search by bill number
   - PO search by PO number

3. **Add totals to list responses**:
   - Invoice list should include total outstanding
   - Bill list should include total payable
   - Stock list should include total value

4. **Consider adding**:
   - Invoice PDF generation endpoint
   - Bill PDF generation
   - Stock export (CSV/Excel)
   - Report export functionality

### Risky Assumptions

1. **Stock Sync**: Inventory operations are manual. No automatic sync with Shopify inventory?

2. **Auto Journal**: Are journal entries auto-generated from business events, or manual only?

3. **COD Flow**: COD remittance workflow unclear - how are orders matched to courier statements?

4. **Multi-Currency**: All amounts assumed single currency (PKR)?

5. **Fiscal Period**: Can entries be created outside open fiscal period?

6. **Invoice Auto-Generation**: Is `from-order` endpoint meant to auto-generate invoices on order completion?

---

## Example API Calls

### TanStack Query Setup

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

### Inventory Examples

```typescript
// List inventory items
const useInventoryItems = (filters: StockQueryDto) => {
  return useQuery({
    queryKey: ['inventory-items', filters],
    queryFn: async () => {
      const { data } = await api.get('/inventory/items', { params: filters });
      return data;
    },
  });
};

// Reserve stock mutation
const useReserveStock = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: ReserveStockDto) => {
      const { data } = await api.post('/inventory/reserve', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-items'] });
      queryClient.invalidateQueries({ queryKey: ['movements'] });
    },
  });
};

// Create purchase order
const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreatePurchaseOrderDto) => {
      const { data } = await api.post('/inventory/purchase-order/create', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-orders'] });
    },
  });
};
```

### Accounting Examples

```typescript
// Get trial balance
const useTrialBalance = (asOfDate?: string) => {
  return useQuery({
    queryKey: ['trial-balance', asOfDate],
    queryFn: async () => {
      const { data } = await api.get('/accounting/journal/trial-balance', {
        params: { asOfDate },
      });
      return data;
    },
  });
};

// Create journal entry with validation
const useCreateJournalEntry = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateJournalEntryDto) => {
      // Client-side validation
      const totalDebit = body.lines.reduce((sum, l) => sum + l.debit, 0);
      const totalCredit = body.lines.reduce((sum, l) => sum + l.credit, 0);

      if (totalDebit !== totalCredit) {
        throw new Error(`Entry must be balanced. Debits: ${totalDebit}, Credits: ${totalCredit}`);
      }

      const { data } = await api.post('/accounting/journal/create', body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });
};

// Create invoice from order
const useCreateInvoiceFromOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: number) => {
      const { data } = await api.post(`/accounting/invoice/from-order/${orderId}`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
};
```

### Billing Examples

```typescript
// Get balance
const useBalance = () => {
  return useQuery({
    queryKey: ['billing-balance'],
    queryFn: async () => {
      const { data } = await api.get('/billing/balance');
      return data.data;
    },
    staleTime: 0, // Always refetch
  });
};

// Initiate recharge
const useInitiateRecharge = () => {
  return useMutation({
    mutationFn: async (body: InitiateRechargeDto) => {
      const { data } = await api.post('/billing/recharge/initiate', body);
      return data;
    },
  });
};

// Bank transfer flow
const useBankTransferRecharge = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ file, amount, notes }: { file: File; amount: number; notes?: string }) => {
      // Step 1: Get upload URL
      const { data: uploadData } = await api.post('/billing/recharge/upload-url');

      // Step 2: Upload to S3
      await axios.put(uploadData.uploadUrl, file, {
        headers: { 'Content-Type': file.type },
      });

      // Step 3: Submit bank transfer request
      const { data } = await api.post('/billing/recharge/bank-transfer', {
        amount,
        screenshotKey: uploadData.key,
        notes,
      });

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['billing-balance'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
  });
};
```

### Reporting Examples

```typescript
// Stock report
const useStockReport = (filters: InventoryReportFilterDto) => {
  return useQuery({
    queryKey: ['report-stock', filters],
    queryFn: async () => {
      const { data } = await api.post('/reports/inventory/stock', filters);
      return data;
    },
    staleTime: 0,
  });
};

// Revenue report
const useRevenueReport = (filters: RevenueReportFilterDto) => {
  return useQuery({
    queryKey: ['report-revenue', filters],
    queryFn: async () => {
      const { data } = await api.post('/reports/accounting/revenue', filters);
      return data;
    },
    staleTime: 0,
    enabled: !!filters.dateRange?.start && !!filters.dateRange?.end,
  });
};

// Profit summary with chart data
const useProfitSummaryChart = (filters: ProfitSummaryFilterDto) => {
  return useQuery({
    queryKey: ['report-profit-summary', filters],
    queryFn: async () => {
      const { data } = await api.post('/reports/accounting/profit-summary', filters);
      return data.data.map((row: ProfitSummaryReportRow) => ({
        period: row.period,
        revenue: row.grossRevenue,
        costs: row.cogs + row.courierCosts,
        profit: row.netProfit,
        margin: row.profitMargin,
      }));
    },
    staleTime: 0,
  });
};
```

---

*Generated: December 2024*
*API Version: v1*
*Base URL: /api/v1*
