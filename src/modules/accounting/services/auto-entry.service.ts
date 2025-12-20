import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { JournalService } from './journal.service';
import { AccountService } from './account.service';
import {
  JournalReferenceType,
  DEFAULT_ACCOUNT_CODES,
  JournalEntryLineData,
} from '../accounting.types';

@Injectable()
export class AutoEntryService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private journalService: JournalService,
    private accountService: AccountService,
  ) {}

  /**
   * Create journal entry when order is shipped (revenue recognition)
   * Debit: Accounts Receivable
   * Credit: Sales Revenue
   * Credit: Shipping Revenue (if applicable)
   * Also records COGS if inventory cost is available
   */
  async createOrderShippedEntry(
    orderId: number,
    cogsAmount?: number,
    userId?: number,
  ) {
    const order = await this.prismaTenant.order.findFirst({
      where: { id: orderId },
      include: {
        items: true,
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const arAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    );
    const salesAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.SALES_REVENUE,
    );
    const shippingRevenueAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.SHIPPING_REVENUE,
    );

    if (!arAccount || !salesAccount) {
      throw new NotFoundException(
        'Required accounts not found. Please initialize default accounts.',
      );
    }

    const lines: JournalEntryLineData[] = [];
    const totalAmount = order.totalAmount || 0;
    const shippingCharges = order.shippingCharges || 0;
    const productRevenue = totalAmount - shippingCharges;

    // Debit Accounts Receivable for total
    lines.push({
      accountId: arAccount.id,
      debit: totalAmount,
      credit: 0,
      memo: `Order #${order.orderNumber}`,
    });

    // Credit Sales Revenue for product amount
    if (productRevenue > 0) {
      lines.push({
        accountId: salesAccount.id,
        debit: 0,
        credit: productRevenue,
        memo: `Sales - Order #${order.orderNumber}`,
      });
    }

    // Credit Shipping Revenue
    if (shippingCharges > 0 && shippingRevenueAccount) {
      lines.push({
        accountId: shippingRevenueAccount.id,
        debit: 0,
        credit: shippingCharges,
        memo: `Shipping - Order #${order.orderNumber}`,
      });
    }

    const revenueEntry = await this.journalService.createEntry({
      date: new Date(),
      description: `Revenue recognition for Order #${order.orderNumber}`,
      referenceType: JournalReferenceType.ORDER,
      referenceId: orderId,
      lines,
      userId,
    });

    // Post the entry automatically
    await this.journalService.post(revenueEntry.id);

    // Create COGS entry if cost is provided
    if (cogsAmount && cogsAmount > 0) {
      await this.createCogsEntry(orderId, cogsAmount, userId);
    }

    return revenueEntry;
  }

  /**
   * Create COGS journal entry
   * Debit: Cost of Goods Sold
   * Credit: Inventory
   */
  async createCogsEntry(orderId: number, amount: number, userId?: number) {
    const order = await this.prismaTenant.order.findFirst({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const cogsAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.COGS,
    );
    const inventoryAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.INVENTORY,
    );

    if (!cogsAccount || !inventoryAccount) {
      throw new NotFoundException('COGS or Inventory account not found');
    }

    const entry = await this.journalService.createEntry({
      date: new Date(),
      description: `COGS for Order #${order.orderNumber}`,
      referenceType: JournalReferenceType.ORDER,
      referenceId: orderId,
      lines: [
        {
          accountId: cogsAccount.id,
          debit: amount,
          credit: 0,
          memo: `COGS - Order #${order.orderNumber}`,
        },
        {
          accountId: inventoryAccount.id,
          debit: 0,
          credit: amount,
          memo: `Inventory reduction - Order #${order.orderNumber}`,
        },
      ],
      userId,
    });

    await this.journalService.post(entry.id);
    return entry;
  }

  /**
   * Create journal entry when payment is received
   * Debit: Cash/Bank
   * Credit: Accounts Receivable
   */
  async createPaymentReceivedEntry(
    paymentId: number,
    amount: number,
    method: string,
    orderId?: number,
    invoiceId?: number,
    userId?: number,
  ) {
    const cashAccount = await this.accountService.getByCode(
      method === 'BANK_TRANSFER'
        ? DEFAULT_ACCOUNT_CODES.BANK
        : DEFAULT_ACCOUNT_CODES.CASH,
    );
    const arAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    );

    if (!cashAccount || !arAccount) {
      throw new NotFoundException('Required accounts not found');
    }

    const description = orderId
      ? `Payment received for Order #${orderId}`
      : invoiceId
        ? `Payment received for Invoice #${invoiceId}`
        : 'Payment received';

    const entry = await this.journalService.createEntry({
      date: new Date(),
      description,
      referenceType: JournalReferenceType.PAYMENT,
      referenceId: paymentId,
      lines: [
        {
          accountId: cashAccount.id,
          debit: amount,
          credit: 0,
          memo: description,
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: amount,
          memo: description,
        },
      ],
      userId,
    });

    await this.journalService.post(entry.id);
    return entry;
  }

  /**
   * Create journal entry for COD remittance received from courier
   * Debit: Bank (net amount)
   * Debit: Courier Charges (deducted charges)
   * Credit: Accounts Receivable (gross amount)
   */
  async createCodRemittanceEntry(
    remittanceId: number,
    grossAmount: number,
    courierCharges: number,
    netAmount: number,
    userId?: number,
  ) {
    const bankAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.BANK,
    );
    const courierChargesAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.COURIER_CHARGES,
    );
    const arAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    );

    if (!bankAccount || !courierChargesAccount || !arAccount) {
      throw new NotFoundException('Required accounts not found');
    }

    const entry = await this.journalService.createEntry({
      date: new Date(),
      description: `COD Remittance #${remittanceId}`,
      referenceType: JournalReferenceType.COD_REMITTANCE,
      referenceId: remittanceId,
      lines: [
        {
          accountId: bankAccount.id,
          debit: netAmount,
          credit: 0,
          memo: 'Net COD received',
        },
        {
          accountId: courierChargesAccount.id,
          debit: courierCharges,
          credit: 0,
          memo: 'Courier charges deducted',
        },
        {
          accountId: arAccount.id,
          debit: 0,
          credit: grossAmount,
          memo: 'COD settlement',
        },
      ],
      userId,
    });

    await this.journalService.post(entry.id);
    return entry;
  }

  /**
   * Create journal entry for refund
   * Debit: Sales Returns
   * Credit: Accounts Receivable (or Cash if already paid)
   */
  async createRefundEntry(
    orderId: number,
    amount: number,
    isPaid: boolean,
    userId?: number,
  ) {
    const order = await this.prismaTenant.order.findFirst({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const salesReturnsAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.SALES_RETURNS,
    );
    const creditAccount = await this.accountService.getByCode(
      isPaid
        ? DEFAULT_ACCOUNT_CODES.CASH
        : DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
    );

    if (!salesReturnsAccount || !creditAccount) {
      throw new NotFoundException('Required accounts not found');
    }

    const entry = await this.journalService.createEntry({
      date: new Date(),
      description: `Refund for Order #${order.orderNumber}`,
      referenceType: JournalReferenceType.REFUND,
      referenceId: orderId,
      lines: [
        {
          accountId: salesReturnsAccount.id,
          debit: amount,
          credit: 0,
          memo: `Refund - Order #${order.orderNumber}`,
        },
        {
          accountId: creditAccount.id,
          debit: 0,
          credit: amount,
          memo: `Refund - Order #${order.orderNumber}`,
        },
      ],
      userId,
    });

    await this.journalService.post(entry.id);
    return entry;
  }

  /**
   * Create journal entry for inventory purchase
   * Debit: Inventory
   * Credit: Accounts Payable
   */
  async createPurchaseEntry(
    purchaseOrderId: number,
    amount: number,
    userId?: number,
  ) {
    const inventoryAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.INVENTORY,
    );
    const apAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    );

    if (!inventoryAccount || !apAccount) {
      throw new NotFoundException('Required accounts not found');
    }

    const entry = await this.journalService.createEntry({
      date: new Date(),
      description: `Inventory purchase - PO #${purchaseOrderId}`,
      referenceType: JournalReferenceType.PURCHASE,
      referenceId: purchaseOrderId,
      lines: [
        {
          accountId: inventoryAccount.id,
          debit: amount,
          credit: 0,
          memo: `PO #${purchaseOrderId}`,
        },
        {
          accountId: apAccount.id,
          debit: 0,
          credit: amount,
          memo: `PO #${purchaseOrderId}`,
        },
      ],
      userId,
    });

    await this.journalService.post(entry.id);
    return entry;
  }

  /**
   * Create journal entry for bill payment
   * Debit: Accounts Payable
   * Credit: Cash/Bank
   */
  async createBillPaymentEntry(
    billId: number,
    amount: number,
    method: string,
    userId?: number,
  ) {
    const apAccount = await this.accountService.getByCode(
      DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE,
    );
    const cashAccount = await this.accountService.getByCode(
      method === 'BANK_TRANSFER'
        ? DEFAULT_ACCOUNT_CODES.BANK
        : DEFAULT_ACCOUNT_CODES.CASH,
    );

    if (!apAccount || !cashAccount) {
      throw new NotFoundException('Required accounts not found');
    }

    const entry = await this.journalService.createEntry({
      date: new Date(),
      description: `Bill payment #${billId}`,
      referenceType: JournalReferenceType.PAYMENT,
      referenceId: billId,
      lines: [
        {
          accountId: apAccount.id,
          debit: amount,
          credit: 0,
          memo: `Bill #${billId}`,
        },
        {
          accountId: cashAccount.id,
          debit: 0,
          credit: amount,
          memo: `Bill #${billId}`,
        },
      ],
      userId,
    });

    await this.journalService.post(entry.id);
    return entry;
  }
}
