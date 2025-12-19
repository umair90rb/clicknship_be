import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { nanoid } from 'nanoid';
import { BillStatus } from '../accounting.types';
import { CreateBillDto, UpdateBillDto, BillQueryDto } from '../dtos/accounting.dto';

@Injectable()
export class BillService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    billNumber: true,
    issueDate: true,
    dueDate: true,
    subtotal: true,
    taxAmount: true,
    totalAmount: true,
    paidAmount: true,
    status: true,
    notes: true,
    createdAt: true,
    supplier: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
      },
    },
    purchaseOrder: {
      select: {
        id: true,
        poNumber: true,
      },
    },
    items: {
      select: {
        id: true,
        description: true,
        quantity: true,
        unitPrice: true,
        lineTotal: true,
        account: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    },
  };

  async list(query: BillQueryDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.supplierId) {
      where.supplierId = query.supplierId;
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

    return this.prismaTenant.bill.findMany({
      where,
      select: this.select,
      orderBy: { issueDate: 'desc' },
    });
  }

  async get(id: number) {
    const bill = await this.prismaTenant.bill.findFirst({
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
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }
    return bill;
  }

  async create(body: CreateBillDto) {
    const billNumber = `BILL-${nanoid(8).toUpperCase()}`;

    // Calculate totals
    let subtotal = 0;
    const itemsData = body.items.map((item) => {
      const lineTotal = item.quantity * item.unitPrice;
      subtotal += lineTotal;

      return {
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal,
        accountId: item.accountId,
      };
    });

    return this.prismaTenant.bill.create({
      data: {
        billNumber,
        supplierId: body.supplierId,
        purchaseOrderId: body.purchaseOrderId,
        issueDate: new Date(body.issueDate),
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        subtotal,
        totalAmount: subtotal,
        notes: body.notes,
        status: BillStatus.PENDING,
        items: {
          create: itemsData,
        },
      },
      select: this.select,
    });
  }

  async createFromPurchaseOrder(purchaseOrderId: number) {
    const po = await this.prismaTenant.purchaseOrder.findFirst({
      where: { id: purchaseOrderId },
      include: {
        items: {
          include: { product: true },
        },
        supplier: true,
      },
    });

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const billNumber = `BILL-${nanoid(8).toUpperCase()}`;

    const itemsData = po.items.map((item) => ({
      description: item.product?.name || 'Product',
      quantity: item.receivedQuantity || item.orderedQuantity,
      unitPrice: item.unitCost,
      lineTotal: (item.receivedQuantity || item.orderedQuantity) * item.unitCost,
    }));

    const subtotal = itemsData.reduce((sum, item) => sum + item.lineTotal, 0);

    return this.prismaTenant.bill.create({
      data: {
        billNumber,
        supplierId: po.supplierId,
        purchaseOrderId: po.id,
        issueDate: new Date(),
        subtotal,
        totalAmount: subtotal,
        status: BillStatus.PENDING,
        items: {
          create: itemsData,
        },
      },
      select: this.select,
    });
  }

  async update(id: number, body: UpdateBillDto) {
    const bill = await this.prismaTenant.bill.findFirst({
      where: { id },
    });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status === BillStatus.PAID) {
      throw new BadRequestException('Cannot update a paid bill');
    }

    return this.prismaTenant.bill.update({
      where: { id },
      data: {
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes,
        status: body.status,
      },
      select: this.select,
    });
  }

  async recordPayment(id: number, amount: number) {
    const bill = await this.prismaTenant.bill.findFirst({
      where: { id },
    });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    const newPaidAmount = bill.paidAmount + amount;
    let newStatus = bill.status;

    if (newPaidAmount >= bill.totalAmount) {
      newStatus = BillStatus.PAID;
    } else if (newPaidAmount > 0) {
      newStatus = BillStatus.PARTIAL;
    }

    return this.prismaTenant.bill.update({
      where: { id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
      select: this.select,
    });
  }

  async delete(id: number) {
    const bill = await this.prismaTenant.bill.findFirst({
      where: { id },
    });
    if (!bill) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.status !== BillStatus.DRAFT) {
      throw new BadRequestException('Only draft bills can be deleted');
    }

    await this.prismaTenant.billItem.deleteMany({
      where: { billId: id },
    });

    return this.prismaTenant.bill.delete({ where: { id } });
  }

  async checkOverdueBills() {
    const now = new Date();
    return this.prismaTenant.bill.updateMany({
      where: {
        status: { in: [BillStatus.PENDING, BillStatus.PARTIAL] },
        dueDate: { lt: now },
      },
      data: { status: BillStatus.OVERDUE },
    });
  }
}
