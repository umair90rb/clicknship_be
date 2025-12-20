import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BillingService } from '../services/billing.service';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';

export const BYPASS_CREDIT_CHECK = 'bypassCreditCheck';

@Injectable()
export class CreditBalanceGuard implements CanActivate {
  constructor(
    private billingService: BillingService,
    private reflector: Reflector,
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenant = request.tenant;
    const user = request.user;

    // Skip if no tenant context
    if (!tenant) return true;

    // Check if route bypasses credit check
    const bypassCredit = this.reflector.getAllAndOverride<boolean>(
      BYPASS_CREDIT_CHECK,
      [context.getHandler(), context.getClass()],
    );
    if (bypassCredit) return true;

    // Get tenant billing info
    const billing = await this.billingService.getTenantBilling(tenant.tenantId);

    // No billing setup yet - allow access
    if (!billing) return true;

    // Check if balance is below negative limit
    if (billing.currentBalance < billing.negativeLimit) {
      // Check user permissions - allow admin/recharge users
      const hasPermission = await this.checkUserPermissions(user.id);

      if (!hasPermission) {
        throw new ForbiddenException({
          message: 'Account suspended due to insufficient balance. Please recharge your account.',
          code: 'INSUFFICIENT_BALANCE',
          currentBalance: billing.currentBalance,
          negativeLimit: billing.negativeLimit,
        });
      }
    }

    return true;
  }

  private async checkUserPermissions(userId: number): Promise<boolean> {
    try {
      const user = await this.prismaTenant.user.findUnique({
        where: { id: userId },
        include: {
          role: {
            include: {
              permissions: true,
            },
          },
        },
      });

      if (!user?.role?.permissions) return false;

      const allowedResources = ['billing', 'admin', 'recharge', 'settings'];

      return user.role.permissions.some((permission: any) =>
        allowedResources.includes(permission.resource),
      );
    } catch {
      return false;
    }
  }
}
