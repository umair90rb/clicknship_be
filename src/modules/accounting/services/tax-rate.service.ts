import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { CreateTaxRateDto, UpdateTaxRateDto } from '../dtos/accounting.dto';

@Injectable()
export class TaxRateService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    name: true,
    rate: true,
    active: true,
    account: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
    createdAt: true,
    updatedAt: true,
  };

  async list(activeOnly: boolean = false) {
    const where: any = {};
    if (activeOnly) {
      where.active = true;
    }

    return this.prismaTenant.taxRate.findMany({
      where,
      select: this.select,
      orderBy: { name: 'asc' },
    });
  }

  async get(id: number) {
    const taxRate = await this.prismaTenant.taxRate.findFirst({
      where: { id },
      select: this.select,
    });
    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }
    return taxRate;
  }

  async create(body: CreateTaxRateDto) {
    // Validate account if provided
    if (body.accountId) {
      const account = await this.prismaTenant.account.findFirst({
        where: { id: body.accountId },
      });
      if (!account) {
        throw new NotFoundException('Account not found');
      }
      // Verify it's a liability account (for tax payable)
      if (account.type !== 'LIABILITY') {
        throw new BadRequestException(
          'Tax account must be a LIABILITY account',
        );
      }
    }

    // Check for duplicate name
    const existing = await this.prismaTenant.taxRate.findFirst({
      where: { name: body.name },
    });
    if (existing) {
      throw new BadRequestException('Tax rate with this name already exists');
    }

    return this.prismaTenant.taxRate.create({
      data: {
        name: body.name,
        rate: body.rate,
        accountId: body.accountId,
      },
      select: this.select,
    });
  }

  async update(id: number, body: UpdateTaxRateDto) {
    const taxRate = await this.prismaTenant.taxRate.findFirst({
      where: { id },
    });
    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    // Validate account if provided
    if (body.accountId) {
      const account = await this.prismaTenant.account.findFirst({
        where: { id: body.accountId },
      });
      if (!account) {
        throw new NotFoundException('Account not found');
      }
      if (account.type !== 'LIABILITY') {
        throw new BadRequestException(
          'Tax account must be a LIABILITY account',
        );
      }
    }

    // Check for duplicate name if changing
    if (body.name && body.name !== taxRate.name) {
      const existing = await this.prismaTenant.taxRate.findFirst({
        where: { name: body.name },
      });
      if (existing) {
        throw new BadRequestException('Tax rate with this name already exists');
      }
    }

    return this.prismaTenant.taxRate.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.rate !== undefined && { rate: body.rate }),
        ...(body.accountId !== undefined && { accountId: body.accountId }),
        ...(body.active !== undefined && { active: body.active }),
      },
      select: this.select,
    });
  }

  async delete(id: number) {
    const taxRate = await this.prismaTenant.taxRate.findFirst({
      where: { id },
    });
    if (!taxRate) {
      throw new NotFoundException('Tax rate not found');
    }

    return this.prismaTenant.taxRate.delete({
      where: { id },
    });
  }

  async calculateTax(amount: number, taxRateId: number): Promise<number> {
    const taxRate = await this.get(taxRateId);
    return (amount * taxRate.rate) / 100;
  }
}
