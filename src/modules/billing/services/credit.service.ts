import { Injectable } from '@nestjs/common';
import { PrismaMasterClient } from '@/src/services/master-connection.service';
import { TransactionType, TransactionReason } from '../enums/transaction-type.enum';

@Injectable()
export class CreditService {
  constructor(private prismaMaster: PrismaMasterClient) {}

  async getOrCreateBilling(tenantId: string) {
    let billing = await this.prismaMaster.tenantBilling.findUnique({
      where: { tenantId },
    });

    if (!billing) {
      billing = await this.prismaMaster.tenantBilling.create({
        data: {
          tenantId,
          currentBalance: 0,
          negativeLimit: -1000,
        },
      });
    }

    return billing;
  }

  async deductCredit(
    tenantId: string,
    amount: number,
    referenceId: string,
    referenceType: string,
    reason: TransactionReason = TransactionReason.order_charge,
  ) {
    return this.prismaMaster.$transaction(async (tx) => {
      let billing = await tx.tenantBilling.findUnique({
        where: { tenantId },
      });

      if (!billing) {
        billing = await tx.tenantBilling.create({
          data: { tenantId, currentBalance: 0, negativeLimit: -1000 },
        });
      }

      const balanceBefore = billing.currentBalance;
      const balanceAfter = balanceBefore - amount;

      await tx.tenantBilling.update({
        where: { tenantId },
        data: {
          currentBalance: balanceAfter,
          totalDebits: { increment: amount },
          isBlocked: balanceAfter < billing.negativeLimit,
        },
      });

      await tx.billingTransaction.create({
        data: {
          tenantId,
          type: TransactionType.debit,
          amount,
          balanceBefore,
          balanceAfter,
          reason,
          referenceType,
          referenceId,
        },
      });

      return { balanceBefore, balanceAfter, isBlocked: balanceAfter < billing.negativeLimit };
    });
  }

  async addCredit(
    tenantId: string,
    amount: number,
    paymentMethod: string,
    referenceId: string,
    reason: TransactionReason = TransactionReason.recharge,
  ) {
    return this.prismaMaster.$transaction(async (tx) => {
      let billing = await tx.tenantBilling.findUnique({
        where: { tenantId },
      });

      if (!billing) {
        billing = await tx.tenantBilling.create({
          data: { tenantId, currentBalance: 0, negativeLimit: -1000 },
        });
      }

      const balanceBefore = billing.currentBalance;
      const balanceAfter = balanceBefore + amount;

      await tx.tenantBilling.update({
        where: { tenantId },
        data: {
          currentBalance: balanceAfter,
          totalCredits: { increment: amount },
          isBlocked: balanceAfter < billing.negativeLimit,
        },
      });

      await tx.billingTransaction.create({
        data: {
          tenantId,
          type: TransactionType.credit,
          amount,
          balanceBefore,
          balanceAfter,
          reason,
          referenceType: 'payment',
          referenceId,
          paymentMethod,
          paymentStatus: 'completed',
        },
      });

      return { balanceBefore, balanceAfter, isBlocked: balanceAfter < billing.negativeLimit };
    });
  }

  async getBalance(tenantId: string) {
    const billing = await this.getOrCreateBilling(tenantId);
    return {
      currentBalance: billing.currentBalance,
      negativeLimit: billing.negativeLimit,
      totalCredits: billing.totalCredits,
      totalDebits: billing.totalDebits,
      isBlocked: billing.isBlocked,
    };
  }
}
