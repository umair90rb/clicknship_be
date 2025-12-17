import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountQueryDto,
} from '../dtos/accounting.dto';
import {
  AccountType,
  AccountSubType,
  DEFAULT_ACCOUNT_CODES,
} from '../accounting.types';

@Injectable()
export class AccountService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private select = {
    id: true,
    code: true,
    name: true,
    type: true,
    subType: true,
    description: true,
    isSystemAccount: true,
    active: true,
    parentId: true,
    parent: {
      select: {
        id: true,
        code: true,
        name: true,
      },
    },
  };

  async list(query: AccountQueryDto) {
    const where: any = {};

    if (query.type) {
      where.type = query.type;
    }
    if (query.activeOnly) {
      where.active = true;
    }

    return this.prismaTenant.account.findMany({
      where,
      select: {
        ...this.select,
        children: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    });
  }

  async get(id: number) {
    const account = await this.prismaTenant.account.findFirst({
      where: { id },
      select: {
        ...this.select,
        children: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }
    return account;
  }

  async getByCode(code: string) {
    return this.prismaTenant.account.findFirst({
      where: { code },
      select: this.select,
    });
  }

  async create(body: CreateAccountDto) {
    const existing = await this.prismaTenant.account.findFirst({
      where: { code: body.code },
    });
    if (existing) {
      throw new BadRequestException('Account with this code already exists');
    }

    if (body.parentId) {
      const parent = await this.prismaTenant.account.findFirst({
        where: { id: body.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent account not found');
      }
      if (parent.type !== body.type) {
        throw new BadRequestException(
          'Child account must have the same type as parent',
        );
      }
    }

    return this.prismaTenant.account.create({
      data: body,
      select: this.select,
    });
  }

  async update(id: number, body: UpdateAccountDto) {
    const account = await this.prismaTenant.account.findFirst({
      where: { id },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystemAccount && body.code && body.code !== account.code) {
      throw new BadRequestException('Cannot change code of system account');
    }

    if (body.code && body.code !== account.code) {
      const existing = await this.prismaTenant.account.findFirst({
        where: { code: body.code },
      });
      if (existing) {
        throw new BadRequestException('Account with this code already exists');
      }
    }

    return this.prismaTenant.account.update({
      where: { id },
      data: body,
      select: this.select,
    });
  }

  async delete(id: number) {
    const account = await this.prismaTenant.account.findFirst({
      where: { id },
      include: {
        _count: {
          select: {
            journalEntryLines: true,
            children: true,
          },
        },
      },
    });

    if (!account) {
      throw new NotFoundException('Account not found');
    }

    if (account.isSystemAccount) {
      throw new BadRequestException('Cannot delete system account');
    }

    if (account._count.journalEntryLines > 0) {
      throw new BadRequestException(
        'Cannot delete account with journal entries',
      );
    }

    if (account._count.children > 0) {
      throw new BadRequestException('Cannot delete account with child accounts');
    }

    return this.prismaTenant.account.delete({ where: { id } });
  }

  async getAccountBalance(id: number, fromDate?: Date, toDate?: Date) {
    const account = await this.prismaTenant.account.findFirst({
      where: { id },
    });
    if (!account) {
      throw new NotFoundException('Account not found');
    }

    const where: any = {
      accountId: id,
      journalEntry: {
        status: 'POSTED',
      },
    };

    if (fromDate || toDate) {
      where.journalEntry.date = {};
      if (fromDate) {
        where.journalEntry.date.gte = fromDate;
      }
      if (toDate) {
        where.journalEntry.date.lte = toDate;
      }
    }

    const lines = await this.prismaTenant.journalEntryLine.findMany({
      where,
      select: {
        debit: true,
        credit: true,
      },
    });

    const totalDebit = lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = lines.reduce((sum, line) => sum + line.credit, 0);

    // For ASSET and EXPENSE accounts, debit increases balance
    // For LIABILITY, EQUITY, and REVENUE accounts, credit increases balance
    let balance: number;
    if (
      account.type === AccountType.ASSET ||
      account.type === AccountType.EXPENSE
    ) {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    return {
      accountId: id,
      accountCode: account.code,
      accountName: account.name,
      accountType: account.type,
      totalDebit,
      totalCredit,
      balance,
    };
  }

  async initializeDefaultAccounts() {
    const defaultAccounts = [
      {
        code: DEFAULT_ACCOUNT_CODES.CASH,
        name: 'Cash',
        type: AccountType.ASSET,
        subType: AccountSubType.CASH,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.BANK,
        name: 'Bank',
        type: AccountType.ASSET,
        subType: AccountSubType.BANK,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE,
        name: 'Accounts Receivable',
        type: AccountType.ASSET,
        subType: AccountSubType.ACCOUNTS_RECEIVABLE,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.INVENTORY,
        name: 'Inventory',
        type: AccountType.ASSET,
        subType: AccountSubType.INVENTORY,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.ACCOUNTS_PAYABLE,
        name: 'Accounts Payable',
        type: AccountType.LIABILITY,
        subType: AccountSubType.ACCOUNTS_PAYABLE,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.SALES_TAX_PAYABLE,
        name: 'Sales Tax Payable',
        type: AccountType.LIABILITY,
        subType: AccountSubType.TAX_PAYABLE,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.SALES_REVENUE,
        name: 'Sales Revenue',
        type: AccountType.REVENUE,
        subType: AccountSubType.SALES,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.SHIPPING_REVENUE,
        name: 'Shipping Revenue',
        type: AccountType.REVENUE,
        subType: AccountSubType.SHIPPING_REVENUE,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.SALES_RETURNS,
        name: 'Sales Returns & Allowances',
        type: AccountType.REVENUE,
        subType: AccountSubType.SALES_RETURNS,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.COGS,
        name: 'Cost of Goods Sold',
        type: AccountType.EXPENSE,
        subType: AccountSubType.COGS,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.SHIPPING_EXPENSE,
        name: 'Shipping Expense',
        type: AccountType.EXPENSE,
        subType: AccountSubType.SHIPPING_EXPENSE,
        isSystemAccount: true,
      },
      {
        code: DEFAULT_ACCOUNT_CODES.COURIER_CHARGES,
        name: 'Courier Charges',
        type: AccountType.EXPENSE,
        subType: AccountSubType.COURIER_CHARGES,
        isSystemAccount: true,
      },
    ];

    const created = [];
    for (const account of defaultAccounts) {
      const existing = await this.prismaTenant.account.findFirst({
        where: { code: account.code },
      });
      if (!existing) {
        const newAccount = await this.prismaTenant.account.create({
          data: account,
          select: this.select,
        });
        created.push(newAccount);
      }
    }

    return { created, message: `Created ${created.length} default accounts` };
  }
}
