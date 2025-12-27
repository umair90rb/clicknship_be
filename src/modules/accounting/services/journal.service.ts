import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { nanoid } from 'nanoid';
import { FiscalPeriodService } from './fiscal-period.service';
import {
  JournalEntryStatus,
  JournalReferenceType,
  CreateJournalEntryData,
  JournalEntryLineData,
} from '../accounting.types';
import { CreateJournalEntryDto, JournalQueryDto } from '../dtos/accounting.dto';

@Injectable()
export class JournalService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
    private fiscalPeriodService: FiscalPeriodService,
  ) {}

  private select = {
    id: true,
    entryNumber: true,
    date: true,
    description: true,
    referenceType: true,
    referenceId: true,
    status: true,
    createdAt: true,
    postedAt: true,
    fiscalPeriod: {
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
    lines: {
      select: {
        id: true,
        debit: true,
        credit: true,
        memo: true,
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    },
    reversedEntry: {
      select: {
        id: true,
        entryNumber: true,
      },
    },
  };

  async list(query: JournalQueryDto) {
    const where: any = {};

    if (query.fromDate || query.toDate) {
      where.date = {};
      if (query.fromDate) {
        where.date.gte = new Date(query.fromDate);
      }
      if (query.toDate) {
        where.date.lte = new Date(query.toDate);
      }
    }

    if (query.accountId) {
      where.lines = {
        some: { accountId: query.accountId },
      };
    }

    if (query.referenceType) {
      where.referenceType = query.referenceType;
    }

    const [data, total] = await Promise.all([
      this.prismaTenant.journalEntry.findMany({
        where,
        select: this.select,
        orderBy: { date: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prismaTenant.journalEntry.count({ where }),
    ]);

    return { data, total };
  }

  async get(id: number) {
    const entry = await this.prismaTenant.journalEntry.findFirst({
      where: { id },
      select: this.select,
    });
    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }
    return {data: entry};
  }

  async getByReference(
    referenceType: JournalReferenceType,
    referenceId: number,
  ) {
    return this.prismaTenant.journalEntry.findMany({
      where: { referenceType, referenceId },
      select: this.select,
      orderBy: { date: 'desc' },
    });
  }

  async create(body: CreateJournalEntryDto, userId?: number) {
    return this.createEntry({
      date: new Date(body.date),
      description: body.description,
      referenceType: body.referenceType,
      referenceId: body.referenceId,
      lines: body.lines,
      userId,
    });
  }

  async createEntry(data: CreateJournalEntryData) {
    // Validate that debits equal credits
    const totalDebit = data.lines.reduce((sum, line) => sum + line.debit, 0);
    const totalCredit = data.lines.reduce((sum, line) => sum + line.credit, 0);

    if (Math.abs(totalDebit - totalCredit) > 0.01) {
      throw new BadRequestException(
        `Journal entry must balance. Debits: ${totalDebit}, Credits: ${totalCredit}`,
      );
    }

    // Validate each line has either debit or credit (not both non-zero)
    for (const line of data.lines) {
      if (line.debit > 0 && line.credit > 0) {
        throw new BadRequestException(
          'Each line must have either debit or credit, not both',
        );
      }
      if (line.debit === 0 && line.credit === 0) {
        throw new BadRequestException(
          'Each line must have either debit or credit amount',
        );
      }
    }

    // Verify all accounts exist
    const accountIds = data.lines.map((line) => line.accountId);
    const accounts = await this.prismaTenant.account.findMany({
      where: { id: { in: accountIds } },
    });
    if (accounts.length !== accountIds.length) {
      throw new BadRequestException('One or more accounts not found');
    }

    // Find fiscal period for the date
    const fiscalPeriod = await this.fiscalPeriodService.getPeriodForDate(
      data.date,
    );

    const entryNumber = `JE-${nanoid(8).toUpperCase()}`;

    return this.prismaTenant.journalEntry.create({
      data: {
        entryNumber,
        date: data.date,
        description: data.description,
        referenceType: data.referenceType,
        referenceId: data.referenceId,
        fiscalPeriodId: fiscalPeriod?.id,
        userId: data.userId,
        lines: {
          create: data.lines.map((line) => ({
            accountId: line.accountId,
            debit: line.debit,
            credit: line.credit,
            memo: line.memo,
          })),
        },
      },
      select: this.select,
    });
  }

  async post(id: number) {
    const entry = await this.prismaTenant.journalEntry.findFirst({
      where: { id },
      include: { fiscalPeriod: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status === JournalEntryStatus.POSTED) {
      throw new BadRequestException('Entry is already posted');
    }

    if (entry.status === JournalEntryStatus.REVERSED) {
      throw new BadRequestException('Cannot post a reversed entry');
    }

    if (entry.fiscalPeriod?.status === 'CLOSED') {
      throw new BadRequestException('Cannot post to a closed fiscal period');
    }

    return this.prismaTenant.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.POSTED,
        postedAt: new Date(),
      },
      select: this.select,
    });
  }

  async reverse(id: number, userId?: number) {
    const entry = await this.prismaTenant.journalEntry.findFirst({
      where: { id },
      include: { lines: true, fiscalPeriod: true },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== JournalEntryStatus.POSTED) {
      throw new BadRequestException('Only posted entries can be reversed');
    }

    // Create reversing entry (swap debits and credits)
    const reversalLines: JournalEntryLineData[] = entry.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
      memo: `Reversal of ${entry.entryNumber}`,
    }));

    const reversalEntry = await this.createEntry({
      date: new Date(),
      description: `Reversal of ${entry.entryNumber}: ${entry.description || ''}`,
      referenceType: entry.referenceType as JournalReferenceType,
      referenceId: entry.referenceId,
      lines: reversalLines,
      userId,
    });

    // Mark original entry as reversed
    await this.prismaTenant.journalEntry.update({
      where: { id },
      data: {
        status: JournalEntryStatus.REVERSED,
        reversedEntryId: reversalEntry.id,
      },
    });

    // Post the reversal entry
    await this.post(reversalEntry.id);

    return this.get(id);
  }

  async delete(id: number) {
    const entry = await this.prismaTenant.journalEntry.findFirst({
      where: { id },
    });

    if (!entry) {
      throw new NotFoundException('Journal entry not found');
    }

    if (entry.status !== JournalEntryStatus.DRAFT) {
      throw new BadRequestException('Only draft entries can be deleted');
    }

    // Delete lines first
    await this.prismaTenant.journalEntryLine.deleteMany({
      where: { journalEntryId: id },
    });

    return this.prismaTenant.journalEntry.delete({ where: { id } });
  }

  async getAccountLedger(accountId: number, fromDate?: Date, toDate?: Date) {
    const where: any = {
      accountId,
      journalEntry: {
        status: JournalEntryStatus.POSTED,
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
        id: true,
        debit: true,
        credit: true,
        memo: true,
        journalEntry: {
          select: {
            id: true,
            entryNumber: true,
            date: true,
            description: true,
            referenceType: true,
            referenceId: true,
          },
        },
      },
      orderBy: {
        journalEntry: { date: 'asc' },
      },
    });

    // Calculate running balance
    let runningBalance = 0;
    const ledger = lines.map((line) => {
      runningBalance += line.debit - line.credit;
      return {
        ...line,
        runningBalance,
      };
    });

    return {data: ledger};
  }

  async getTrialBalance(asOfDate?: Date) {
    const where: any = {
      journalEntry: {
        status: JournalEntryStatus.POSTED,
      },
    };

    if (asOfDate) {
      where.journalEntry.date = { lte: asOfDate };
    }

    const lines = await this.prismaTenant.journalEntryLine.findMany({
      where,
      select: {
        debit: true,
        credit: true,
        account: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Aggregate by account
    const accountBalances = new Map<
      number,
      { account: any; debit: number; credit: number }
    >();

    for (const line of lines) {
      const existing = accountBalances.get(line.account.id);
      if (existing) {
        existing.debit += line.debit;
        existing.credit += line.credit;
      } else {
        accountBalances.set(line.account.id, {
          account: line.account,
          debit: line.debit,
          credit: line.credit,
        });
      }
    }

    const trialBalance = Array.from(accountBalances.values())
      .map((item) => ({
        ...item,
        balance: item.debit - item.credit,
      }))
      .sort((a, b) => a.account.code.localeCompare(b.account.code));

    const totalDebit = trialBalance.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = trialBalance.reduce(
      (sum, item) => sum + item.credit,
      0,
    );

    return {data: {
      accounts: trialBalance,
      totalDebit,
      totalCredit,
      isBalanced: Math.abs(totalDebit - totalCredit) < 0.01,
    }};
  }
}
