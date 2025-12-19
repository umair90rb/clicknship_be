import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { nanoid } from 'nanoid';
import { InvoiceStatus } from '../accounting.types';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
} from '../dtos/accounting.dto';

@Injectable()
export class InvoiceService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    invoiceNumber: true,
    issueDate: true,
    dueDate: true,
    subtotal: true,
    taxAmount: true,
    totalAmount: true,
    paidAmount: true,
    status: true,
    notes: true,
    createdAt: true,
    customer: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    },
    order: {
      select: {
        id: true,
        orderNumber: true,
      },
    },
    items: {
      select: {
        id: true,
        description: true,
        quantity: true,
        unitPrice: true,
        taxRate: true,
        taxAmount: true,
        lineTotal: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
      },
    },
  };

  async list(query: InvoiceQueryDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.customerId) {
      where.customerId = query.customerId;
    }
    if (query.fromDate || query.toDate) {
      where.issueDate = {};
      if (query.fromDate) {
        where.issueDate.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.issueDate.lte = new Date(query.toDate);
      }
    }

    return this.prismaTenant.invoice.findMany({
      where,
      select: this.select,
      orderBy: { issueDate: 'desc' },
    });
  }

  async get(id: number) {
    const invoice = await this.prismaTenant.invoice.findFirst({
      where: { id },
      select: {
        ...this.select,
        payments: {
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            date: true,
            method: true,
          },
        },
      },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    return invoice;
  }

  async create(body: CreateInvoiceDto) {
    const invoiceNumber = `INV-${nanoid(8).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;

    const itemsData = body.items.map((item) => {
      const lineSubtotal = item.quantity * item.unitPrice;
      const lineTax = lineSubtotal * ((item.taxRate || 0) / 100);
      const lineTotal = lineSubtotal + lineTax;

      subtotal += lineSubtotal;
      taxAmount += lineTax;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate || 0,
        taxAmount: lineTax,
        lineTotal,
        productId: item.productId,
      };
    });

    const totalAmount = subtotal + taxAmount;

    return this.prismaTenant.invoice.create({
      data: {
        invoiceNumber,
        customerId: body.customerId,
        orderId: body.orderId,
        issueDate: new Date(body.issueDate),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtotal,
        taxAmount,
        totalAmount,
        notes: body.notes,
        items: {
          create: itemsData,
        },
      },
      select: this.select,
    });
  }

  async createFromOrder(orderId: number) {
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

    const invoiceNumber = `INV-${nanoid(8).toUpperCase()}`;
    const subtotal = order.totalAmount || 0;
    const taxAmount = order.totalTax || 0;
    const totalAmount = subtotal + taxAmount;

    const itemsData = order.items.map((item) => ({
      description: item.name || 'Product',
      quantity: item.quantity || 1,
      unitPrice: item.unitPrice || 0,
      taxRate: 0,
      taxAmount: 0,
      lineTotal: (item.quantity || 1) * (item.unitPrice || 0),
    }));

    return this.prismaTenant.invoice.create({
      data: {
        invoiceNumber,
        customerId: order.customerId,
        orderId: order.id,
        issueDate: new Date(),
        subtotal,
        taxAmount,
        totalAmount,
        items: {
          create: itemsData,
        },
      },
      select: this.select,
    });
  }

  async update(id: number, body: UpdateInvoiceDto) {
    const invoice = await this.prismaTenant.invoice.findFirst({
      where: { id },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException('Cannot update a paid invoice');
    }

    return this.prismaTenant.invoice.update({
      where: { id },
      data: {
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        status: body.status,
      },
      select: this.select,
    });
  }

  async markAsSent(id: number) {
    const invoice = await this.prismaTenant.invoice.findFirst({
      where: { id },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be marked as sent');
    }

    return this.prismaTenant.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.SENT },
      select: this.select,
    });
  }

  async recordPayment(id: number, amount: number) {
    const invoice = await this.prismaTenant.invoice.findFirst({
      where: { id },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const newPaidAmount = invoice.paidAmount + amount;
    let newStatus = invoice.status;

    if (newPaidAmount >= invoice.totalAmount) {
      newStatus = InvoiceStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = InvoiceStatus.PARTIAL;
    }

    return this.prismaTenant.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
      select: this.select,
    });
  }

  async cancel(id: number) {
    const invoice = await this.prismaTenant.invoice.findFirst({
      where: { id },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.paidAmount > 0) {
      throw new BadRequestException(
        'Cannot cancel invoice with recorded payments',
      );
    }

    return this.prismaTenant.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
      select: this.select,
    });
  }

  async delete(id: number) {
    const invoice = await this.prismaTenant.invoice.findFirst({
      where: { id },
    });
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be deleted');
    }

    await this.prismaTenant.invoiceItem.deleteMany({
      where: { invoiceId: id },
    });

    return this.prismaTenant.invoice.delete({ where: { id } });
  }

  async checkOverdueInvoices() {
    const now = new Date();
    return this.prismaTenant.invoice.updateMany({
      where: {
        status: { in: [InvoiceStatus.SENT, InvoiceStatus.PARTIAL] },
        dueDate: { lt: now },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });
  }
}
