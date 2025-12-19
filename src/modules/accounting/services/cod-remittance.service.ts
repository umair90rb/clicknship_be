import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { nanoid } from 'nanoid';
import { AutoEntryService } from './auto-entry.service';
import { CodRemittanceStatus } from '../accounting.types';
import {
  CreateCodRemittanceDto,
  UpdateCodRemittanceStatusDto,
  CodRemittanceQueryDto,
} from '../dtos/accounting.dto';

@Injectable()
export class CodRemittanceService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private autoEntryService: AutoEntryService,
  ) {}

  private select = {
    id: true,
    remittanceNumber: true,
    statementDate: true,
    totalOrders: true,
    grossAmount: true,
    courierCharges: true,
    netAmount: true,
    status: true,
    receivedDate: true,
    bankReference: true,
    notes: true,
    createdAt: true,
    courierService: {
      select: {
        id: true,
        name: true,
      },
    },
    user: {
      select: {
        id: true,
        name: true,
      },
    },
    items: {
      select: {
        id: true,
        cn: true,
        amount: true,
        courierCharge: true,
        order: {
          select: {
            id: true,
            orderNumber: true,
          },
        },
      },
    },
  };

  async list(query: CodRemittanceQueryDto) {
    const where: any = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.courierServiceId) {
      where.courierServiceId = query.courierServiceId;
    }
    if (query.fromDate || query.toDate) {
      where.statementDate = {};
      if (query.fromDate) {
        where.statementDate.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.statementDate.lte = new Date(query.toDate);
      }
    }

    return this.prismaTenant.codRemittance.findMany({
      where,
      select: this.select,
      orderBy: { statementDate: 'desc' },
    });
  }

  async get(id: number) {
    const remittance = await this.prismaTenant.codRemittance.findFirst({
      where: { id },
      select: this.select,
    });
    if (!remittance) {
      throw new NotFoundException('COD remittance not found');
    }
    return remittance;
  }

  async create(body: CreateCodRemittanceDto, userId?: number) {
    const remittanceNumber = `COD-${nanoid(8).toUpperCase()}`;

    // Calculate totals from items
    let grossAmount = 0;
    let courierCharges = 0;

    for (const item of body.items) {
      grossAmount += item.amount;
      courierCharges += item.courierCharge;
    }

    const netAmount = grossAmount - courierCharges;

    // Validate orders exist
    for (const item of body.items) {
      const order = await this.prismaTenant.order.findFirst({
        where: { id: item.orderId },
      });
      if (!order) {
        throw new NotFoundException(`Order with ID ${item.orderId} not found`);
      }
    }

    const remittance = await this.prismaTenant.codRemittance.create({
      data: {
        remittanceNumber,
        courierServiceId: body.courierServiceId,
        statementDate: new Date(body.statementDate),
        totalOrders: body.items.length,
        grossAmount,
        courierCharges,
        netAmount,
        status: CodRemittanceStatus.PENDING,
        bankReference: body.bankReference,
        notes: body.notes,
        userId,
        items: {
          create: body.items.map((item) => ({
            orderId: item.orderId,
            cn: item.cn,
            amount: item.amount,
            courierCharge: item.courierCharge,
          })),
        },
      },
      select: this.select,
    });

    return remittance;
  }

  async updateStatus(
    id: number,
    body: UpdateCodRemittanceStatusDto,
    userId?: number,
  ) {
    const remittance = await this.prismaTenant.codRemittance.findFirst({
      where: { id },
    });
    if (!remittance) {
      throw new NotFoundException('COD remittance not found');
    }

    const updateData: any = {
      status: body.status,
    };

    if (body.bankReference) {
      updateData.bankReference = body.bankReference;
    }

    // If marking as received, set the received date and create journal entry
    if (body.status === CodRemittanceStatus.RECEIVED) {
      updateData.receivedDate = new Date();

      // Create accounting entry for COD remittance
      await this.autoEntryService.createCodRemittanceEntry(
        id,
        remittance.grossAmount,
        remittance.courierCharges,
        remittance.netAmount,
        userId,
      );
    }

    return this.prismaTenant.codRemittance.update({
      where: { id },
      data: updateData,
      select: this.select,
    });
  }

  async delete(id: number) {
    const remittance = await this.prismaTenant.codRemittance.findFirst({
      where: { id },
      include: { payments: true },
    });

    if (!remittance) {
      throw new NotFoundException('COD remittance not found');
    }

    // Cannot delete if there are associated payment records
    if (remittance.payments && remittance.payments.length > 0) {
      throw new BadRequestException(
        'Cannot delete remittance with associated payment records',
      );
    }

    // Cannot delete if already received (accounting entry has been created)
    if (remittance.status === CodRemittanceStatus.RECEIVED ||
        remittance.status === CodRemittanceStatus.RECONCILED) {
      throw new BadRequestException(
        'Cannot delete remittance that has been received or reconciled',
      );
    }

    // Delete items first
    await this.prismaTenant.codRemittanceItem.deleteMany({
      where: { codRemittanceId: id },
    });

    return this.prismaTenant.codRemittance.delete({
      where: { id },
    });
  }

  async getSummary(courierServiceId?: number, fromDate?: Date, toDate?: Date) {
    const where: any = {};

    if (courierServiceId) {
      where.courierServiceId = courierServiceId;
    }
    if (fromDate || toDate) {
      where.statementDate = {};
      if (fromDate) {
        where.statementDate.gte = fromDate;
      }
      if (toDate) {
        where.statementDate.lte = toDate;
      }
    }

    const remittances = await this.prismaTenant.codRemittance.findMany({
      where,
      select: {
        status: true,
        grossAmount: true,
        courierCharges: true,
        netAmount: true,
        totalOrders: true,
      },
    });

    const summary = {
      totalRemittances: remittances.length,
      totalOrders: 0,
      totalGross: 0,
      totalCourierCharges: 0,
      totalNet: 0,
      pending: { count: 0, amount: 0 },
      received: { count: 0, amount: 0 },
      reconciled: { count: 0, amount: 0 },
      disputed: { count: 0, amount: 0 },
    };

    for (const r of remittances) {
      summary.totalOrders += r.totalOrders;
      summary.totalGross += r.grossAmount;
      summary.totalCourierCharges += r.courierCharges;
      summary.totalNet += r.netAmount;

      switch (r.status) {
        case CodRemittanceStatus.PENDING:
          summary.pending.count++;
          summary.pending.amount += r.netAmount;
          break;
        case CodRemittanceStatus.RECEIVED:
          summary.received.count++;
          summary.received.amount += r.netAmount;
          break;
        case CodRemittanceStatus.RECONCILED:
          summary.reconciled.count++;
          summary.reconciled.amount += r.netAmount;
          break;
        case CodRemittanceStatus.DISPUTED:
          summary.disputed.count++;
          summary.disputed.amount += r.netAmount;
          break;
      }
    }

    return summary;
  }

  async getByOrder(orderId: number) {
    const items = await this.prismaTenant.codRemittanceItem.findMany({
      where: { orderId },
      include: {
        codRemittance: {
          select: {
            id: true,
            remittanceNumber: true,
            statementDate: true,
            status: true,
            courierService: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return items;
  }
}
