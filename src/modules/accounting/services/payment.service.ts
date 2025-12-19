import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { nanoid } from 'nanoid';
import { InvoiceService } from './invoice.service';
import { BillService } from './bill.service';
import { AutoEntryService } from './auto-entry.service';
import { PaymentType } from '../accounting.types';
import { CreatePaymentDto, PaymentQueryDto } from '../dtos/accounting.dto';

@Injectable()
export class PaymentService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private invoiceService: InvoiceService,
    private billService: BillService,
    private autoEntryService: AutoEntryService,
  ) {}

  private select = {
    id: true,
    paymentNumber: true,
    type: true,
    method: true,
    amount: true,
    date: true,
    bankAccount: true,
    transactionRef: true,
    notes: true,
    createdAt: true,
    invoice: {
      select: {
        id: true,
        invoiceNumber: true,
      },
    },
    bill: {
      select: {
        id: true,
        billNumber: true,
      },
    },
    order: {
      select: {
        id: true,
        orderNumber: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
      },
    },
  };

  async list(query: PaymentQueryDto) {
    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) {
        where.date.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.date.lte = new Date(query.toDate);
      }
    }

    return this.prismaTenant.paymentRecord.findMany({
      where,
      select: this.select,
      orderBy: { date: 'desc' },
    });
  }

  async get(id: number) {
    const payment = await this.prismaTenant.paymentRecord.findFirst({
      where: { id },
      select: this.select,
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    return payment;
  }

  async create(body: CreatePaymentDto, userId?: number) {
    const paymentNumber = `PAY-${nanoid(8).toUpperCase()}`;

    // Validate based on payment type
    if (body.type === PaymentType.RECEIPT) {
      if (!body.invoiceId && !body.orderId) {
        throw new BadRequestException(
          'Receipt payment requires invoice or order reference',
        );
      }
    }

    if (body.type === PaymentType.DISBURSEMENT) {
      if (!body.billId) {
        throw new BadRequestException(
          'Disbursement payment requires bill reference',
        );
      }
    }

    const payment = await this.prismaTenant.paymentRecord.create({
      data: {
        paymentNumber,
        type: body.type,
        method: body.method,
        amount: body.amount,
        date: new Date(body.date),
        invoiceId: body.invoiceId,
        billId: body.billId,
        orderId: body.orderId,
        bankAccount: body.bankAccount,
        transactionRef: body.transactionRef,
        notes: body.notes,
        userId,
      },
      select: this.select,
    });

    // Update related records and create journal entries
    if (body.type === PaymentType.RECEIPT) {
      if (body.invoiceId) {
        await this.invoiceService.recordPayment(body.invoiceId, body.amount);
      }
      await this.autoEntryService.createPaymentReceivedEntry(
        payment.id,
        body.amount,
        body.method,
        body.orderId,
        body.invoiceId,
        userId,
      );
    }

    if (body.type === PaymentType.DISBURSEMENT && body.billId) {
      await this.billService.recordPayment(body.billId, body.amount);
      await this.autoEntryService.createBillPaymentEntry(
        body.billId,
        body.amount,
        body.method,
        userId,
      );
    }

    return payment;
  }

  async getByInvoice(invoiceId: number) {
    return this.prismaTenant.paymentRecord.findMany({
      where: { invoiceId },
      select: this.select,
      orderBy: { date: 'desc' },
    });
  }

  async getByBill(billId: number) {
    return this.prismaTenant.paymentRecord.findMany({
      where: { billId },
      select: this.select,
      orderBy: { date: 'desc' },
    });
  }

  async getByOrder(orderId: number) {
    return this.prismaTenant.paymentRecord.findMany({
      where: { orderId },
      select: this.select,
      orderBy: { date: 'desc' },
    });
  }

  async getSummary(fromDate?: Date, toDate?: Date) {
    const where: any = {};
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) {
        where.date.gte = fromDate;
      }
      if (toDate) {
        where.date.lte = toDate;
      }
    }

    const payments = await this.prismaTenant.paymentRecord.findMany({
      where,
      select: {
        type: true,
        method: true,
        amount: true,
      },
    });

    const summary = {
      totalReceipts: 0,
      totalDisbursements: 0,
      totalRefunds: 0,
      totalCodRemittances: 0,
      byMethod: {} as Record<string, number>,
    };

    for (const payment of payments) {
      switch (payment.type) {
        case PaymentType.RECEIPT:
          summary.totalReceipts += payment.amount;
          break;
        case PaymentType.DISBURSEMENT:
          summary.totalDisbursements += payment.amount;
          break;
        case PaymentType.REFUND:
          summary.totalRefunds += payment.amount;
          break;
        case PaymentType.COD_REMITTANCE:
          summary.totalCodRemittances += payment.amount;
          break;
      }

      summary.byMethod[payment.method] =
        (summary.byMethod[payment.method] || 0) + payment.amount;
    }

    return {
      ...summary,
      netCashFlow:
        summary.totalReceipts +
        summary.totalCodRemittances -
        summary.totalDisbursements -
        summary.totalRefunds,
    };
  }
}
