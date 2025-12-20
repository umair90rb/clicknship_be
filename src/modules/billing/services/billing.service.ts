import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import {
  ListTransactionsDto,
  ListBillingsDto,
  ListPaymentRequestsDto,
  UpdateNegativeLimitDto,
} from '../dtos';
import { CreditService } from './credit.service';
import { TransactionReason } from '../enums/transaction-type.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Injectable()
export class BillingService {
  constructor(
    private prismaMaster: PrismaMasterClient,
    private creditService: CreditService,
  ) {}

  async getTenantBilling(tenantId: string) {
    return this.prismaMaster.tenantBilling.findUnique({
      where: { tenantId },
    });
  }

  async getBalance(tenantId: string) {
    return this.creditService.getBalance(tenantId);
  }

  async listTransactions(tenantId: string, body: ListTransactionsDto) {
    const { skip, take, ...filters } = body;
    const where: any = { tenantId };

    if (filters.type) {
      where.type = filters.type;
    }

    if (filters.reason) {
      where.reason = filters.reason;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.billingTransaction.count({ where }),
      this.prismaMaster.billingTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: { total, skip, take, ...filters },
    };
  }

  async listAllBillings(body: ListBillingsDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.tenantId) {
      where.tenantId = { contains: filters.tenantId, mode: 'insensitive' };
    }

    if (filters.isBlocked !== undefined) {
      where.isBlocked = filters.isBlocked;
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.tenantBilling.count({ where }),
      this.prismaMaster.tenantBilling.findMany({
        where,
        skip,
        take,
        orderBy: { updatedAt: 'desc' },
        include: {
          tenant: {
            select: { tenantId: true, companyName: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: { total, skip, take, ...filters },
    };
  }

  async updateNegativeLimit(tenantId: string, dto: UpdateNegativeLimitDto) {
    const billing = await this.prismaMaster.tenantBilling.findUnique({
      where: { tenantId },
    });

    if (!billing) {
      throw new NotFoundException('Tenant billing not found');
    }

    const updated = await this.prismaMaster.tenantBilling.update({
      where: { tenantId },
      data: {
        negativeLimit: dto.negativeLimit,
        isBlocked: billing.currentBalance < dto.negativeLimit,
      },
    });

    return { data: updated };
  }

  async addManualCredit(tenantId: string, amount: number, reason: string, adminId: string) {
    const result = await this.creditService.addCredit(
      tenantId,
      amount,
      'manual',
      `manual_${adminId}_${Date.now()}`,
      TransactionReason.manual_adjustment,
    );

    return { data: result };
  }

  // Bank Details Management
  async getBankDetails() {
    const data = await this.prismaMaster.bankDetail.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
    });

    return { data };
  }

  async getAllBankDetails() {
    const data = await this.prismaMaster.bankDetail.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { data };
  }

  async createBankDetail(dto: any) {
    const bankDetail = await this.prismaMaster.bankDetail.create({
      data: dto,
    });

    return { data: bankDetail };
  }

  async updateBankDetail(id: string, dto: any) {
    const bankDetail = await this.prismaMaster.bankDetail.findUnique({
      where: { id },
    });

    if (!bankDetail) {
      throw new NotFoundException('Bank detail not found');
    }

    const updated = await this.prismaMaster.bankDetail.update({
      where: { id },
      data: dto,
    });

    return { data: updated };
  }

  // Payment Requests
  async createPaymentRequest(
    tenantId: string,
    amount: number,
    paymentMethod: string,
    gatewayRef?: string,
  ) {
    const paymentRequest = await this.prismaMaster.paymentRequest.create({
      data: {
        tenantId,
        amount,
        paymentMethod,
        gatewayRef,
        status: PaymentStatus.pending,
      },
    });

    return paymentRequest;
  }

  async getPaymentRequest(id: string) {
    const paymentRequest = await this.prismaMaster.paymentRequest.findUnique({
      where: { id },
    });

    if (!paymentRequest) {
      throw new NotFoundException('Payment request not found');
    }

    return paymentRequest;
  }

  async updatePaymentRequest(id: string, data: any) {
    return this.prismaMaster.paymentRequest.update({
      where: { id },
      data,
    });
  }

  async listPaymentRequests(body: ListPaymentRequestsDto) {
    const { skip, take, ...filters } = body;
    const where: any = {};

    if (filters.tenantId) {
      where.tenantId = filters.tenantId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.paymentMethod) {
      where.paymentMethod = filters.paymentMethod;
    }

    const [total, data] = await Promise.all([
      this.prismaMaster.paymentRequest.count({ where }),
      this.prismaMaster.paymentRequest.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: { total, skip, take, ...filters },
    };
  }

  async approvePaymentRequest(id: string, adminId: string, adminNotes?: string) {
    const paymentRequest = await this.getPaymentRequest(id);

    if (paymentRequest.status !== PaymentStatus.pending) {
      throw new NotFoundException('Payment request is not pending');
    }

    // Add credit to tenant
    await this.creditService.addCredit(
      paymentRequest.tenantId,
      paymentRequest.amount,
      paymentRequest.paymentMethod,
      paymentRequest.id,
    );

    // Update payment request
    const updated = await this.prismaMaster.paymentRequest.update({
      where: { id },
      data: {
        status: PaymentStatus.completed,
        processedBy: adminId,
        processedAt: new Date(),
        adminNotes,
      },
    });

    return { data: updated };
  }

  async rejectPaymentRequest(id: string, adminId: string, adminNotes?: string) {
    const paymentRequest = await this.getPaymentRequest(id);

    if (paymentRequest.status !== PaymentStatus.pending) {
      throw new NotFoundException('Payment request is not pending');
    }

    const updated = await this.prismaMaster.paymentRequest.update({
      where: { id },
      data: {
        status: PaymentStatus.failed,
        processedBy: adminId,
        processedAt: new Date(),
        adminNotes,
      },
    });

    return { data: updated };
  }
}
