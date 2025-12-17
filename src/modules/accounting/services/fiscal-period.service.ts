import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import {
  CreateFiscalPeriodDto,
  UpdateFiscalPeriodDto,
} from '../dtos/accounting.dto';
import { FiscalPeriodStatus } from '../accounting.types';

@Injectable()
export class FiscalPeriodService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
    status: true,
    closedAt: true,
  };

  async list() {
    return this.prismaTenant.fiscalPeriod.findMany({
      select: {
        ...this.select,
        _count: { select: { journalEntries: true } },
      },
      orderBy: { startDate: 'desc' },
    });
  }

  async get(id: number) {
    const period = await this.prismaTenant.fiscalPeriod.findFirst({
      where: { id },
      select: this.select,
    });
    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }
    return period;
  }

  async getCurrentPeriod() {
    const now = new Date();
    return this.prismaTenant.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
        status: FiscalPeriodStatus.OPEN,
      },
      select: this.select,
    });
  }

  async getPeriodForDate(date: Date) {
    return this.prismaTenant.fiscalPeriod.findFirst({
      where: {
        startDate: { lte: date },
        endDate: { gte: date },
      },
      select: this.select,
    });
  }

  async create(body: CreateFiscalPeriodDto) {
    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for overlapping periods
    const overlapping = await this.prismaTenant.fiscalPeriod.findFirst({
      where: {
        OR: [
          {
            startDate: { lte: startDate },
            endDate: { gte: startDate },
          },
          {
            startDate: { lte: endDate },
            endDate: { gte: endDate },
          },
          {
            startDate: { gte: startDate },
            endDate: { lte: endDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new BadRequestException(
        `Period overlaps with existing period: ${overlapping.name}`,
      );
    }

    return this.prismaTenant.fiscalPeriod.create({
      data: {
        name: body.name,
        startDate,
        endDate,
      },
      select: this.select,
    });
  }

  async update(id: number, body: UpdateFiscalPeriodDto) {
    const period = await this.prismaTenant.fiscalPeriod.findFirst({
      where: { id },
    });
    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }

    if (period.status === FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException('Cannot update closed period');
    }

    return this.prismaTenant.fiscalPeriod.update({
      where: { id },
      data: body,
      select: this.select,
    });
  }

  async close(id: number) {
    const period = await this.prismaTenant.fiscalPeriod.findFirst({
      where: { id },
      include: {
        journalEntries: {
          where: { status: 'DRAFT' },
          select: { id: true },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }

    if (period.status === FiscalPeriodStatus.CLOSED) {
      throw new BadRequestException('Period is already closed');
    }

    if (period.journalEntries.length > 0) {
      throw new BadRequestException(
        `Cannot close period with ${period.journalEntries.length} draft journal entries`,
      );
    }

    return this.prismaTenant.fiscalPeriod.update({
      where: { id },
      data: {
        status: FiscalPeriodStatus.CLOSED,
        closedAt: new Date(),
      },
      select: this.select,
    });
  }

  async reopen(id: number) {
    const period = await this.prismaTenant.fiscalPeriod.findFirst({
      where: { id },
    });

    if (!period) {
      throw new NotFoundException('Fiscal period not found');
    }

    if (period.status === FiscalPeriodStatus.OPEN) {
      throw new BadRequestException('Period is already open');
    }

    return this.prismaTenant.fiscalPeriod.update({
      where: { id },
      data: {
        status: FiscalPeriodStatus.OPEN,
        closedAt: null,
      },
      select: this.select,
    });
  }
}
