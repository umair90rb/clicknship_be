// Response wrapper type
export interface ReportResponse<T> {
  data: T[];
  meta: {
    total: number;
    filters: Record<string, any>;
    generatedAt: string;
  };
}

// ============ Order Report Types ============

export interface AgentOrderReportRow {
  userId: number;
  userName: string;
  totalOrders: number;
  confirmedCount: number;
  assignedCount: number;
  noPickCount: number;
  paymentPendingCount: number;
  cancelCount: number;
  deliveredCount: number;
}

export interface ProductUnitReportRow {
  productName: string;
  sku: string;
  totalUnits: number;
  confirmedUnits: number;
  noPickUnits: number;
  cancelUnits: number;
}

export interface BookingUnitReportRow {
  productName: string;
  sku: string;
  confirmedUnits: number;
  bookedUnits: number;
  bookingErrorUnits: number;
  deliveredByCourier: { courierServiceName: string; courierName: string; units: number }[];
}

export interface FocUnitReportRow {
  productName: string;
  sku: string;
  totalFocUnits: number;
  deliveredByCourier: { courierServiceName: string; courierName: string; units: number }[];
}

export interface AgentChannelReportRow {
  channelId: number;
  channelName: string;
  userId: number;
  userName: string;
  totalOrders: number;
  duplicateOrders: number;
  confirmedOrders: number;
  totalCodAmount: number;
  totalProductCount: number;
  confirmedProductCount: number;
  duplicateProductCount: number;
}

export interface ChannelOrderReportRow {
  channelId: number;
  channelName: string;
  totalOrders: number;
  confirmedOrders: number;
  duplicateOrders: number;
  cancelOrders: number;
  noPickOrders: number;
  totalProductCount: number;
  confirmedProductCount: number;
  duplicateProductCount: number;
}

export interface UserIncentiveReportRow {
  userId: number;
  userName: string;
  productName: string;
  sku: string;
  confirmedCount: number;
  deliveredCount: number;
  incentivePerUnit: number;
  totalIncentive: number;
}

export interface CourierDeliveryReportRow {
  courierServiceId: number;
  courierServiceName: string;
  courierName: string;
  bookedCount: number;
  deliveredCount: number;
  inTransitCount: number;
  returnedCount: number;
  bookingErrorCount: number;
  canceledCount: number;
}

export interface CourierDispatchReportRow {
  courierServiceId: number;
  courierServiceName: string;
  courierName: string;
  totalBookedOrders: number;
}

export interface ChannelOrderGenerationReportRow {
  domain: string;
  ordersCount: number;
  totalUnits: number;
  totalAmount: number;
}

export interface BookedProductValueReportRow {
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  totalValue: number;
}

// ============ Inventory Report Types ============

export interface StockReportRow {
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

export interface StockDamagedReportRow {
  productId: number;
  productName: string;
  sku: string;
  locationId: number | null;
  locationName: string | null;
  totalDamagedQuantity: number;
  totalDamagedValue: number;
  movements: {
    date: string;
    quantity: number;
    reason: string | null;
    userId: number | null;
    userName: string | null;
  }[];
}

export interface StockExpiredReportRow {
  productId: number;
  productName: string;
  sku: string;
  locationId: number | null;
  locationName: string | null;
  totalExpiredQuantity: number;
  totalExpiredValue: number;
  movements: {
    date: string;
    quantity: number;
    reason: string | null;
    userId: number | null;
    userName: string | null;
  }[];
}

export interface StockMovementReportRow {
  movementId: number;
  date: string;
  productId: number;
  productName: string;
  sku: string;
  locationId: number | null;
  locationName: string | null;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string | null;
  referenceType: string | null;
  referenceId: number | null;
  costAtTime: number | null;
  userId: number | null;
  userName: string | null;
}

export interface LowStockReportRow {
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

export interface StockValuationReportRow {
  productId: number;
  productName: string;
  sku: string;
  locationId: number | null;
  locationName: string | null;
  quantity: number;
  costPrice: number;
  totalValue: number;
}

export interface PurchaseOrderReportRow {
  purchaseOrderId: number;
  poNumber: string;
  status: string;
  supplierId: number | null;
  supplierName: string | null;
  orderDate: string | null;
  expectedDate: string | null;
  receivedDate: string | null;
  totalAmount: number;
  itemCount: number;
  receivedItemCount: number;
}

// ============ Accounting Report Types ============

export interface RevenueReportRow {
  period: string;
  grossRevenue: number;
  discounts: number;
  shippingCharges: number;
  taxes: number;
  netRevenue: number;
  orderCount: number;
}

export interface InvoiceAgingReportRow {
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

export interface CodRemittanceReportRow {
  courierServiceId: number;
  courierServiceName: string;
  courierName: string;
  remittanceCount: number;
  totalOrders: number;
  grossAmount: number;
  courierCharges: number;
  netAmount: number;
  pendingCount: number;
  receivedCount: number;
  reconciledCount: number;
  disputedCount: number;
}

export interface PaymentReportRow {
  paymentId: number;
  paymentNumber: string;
  date: string;
  type: string;
  method: string;
  amount: number;
  invoiceNumber: string | null;
  billNumber: string | null;
  orderNumber: string | null;
  bankAccount: string | null;
  transactionRef: string | null;
  userId: number | null;
  userName: string | null;
}

export interface ProfitSummaryReportRow {
  period: string;
  grossRevenue: number;
  cogs: number;
  grossProfit: number;
  shippingIncome: number;
  courierCosts: number;
  netProfit: number;
  profitMargin: number;
}
