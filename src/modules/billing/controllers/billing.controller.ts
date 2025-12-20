import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { Tenant } from '@/src/decorators/tenant.decorator';
import { Tenant as TenantType } from '@/src/types/tenant';
import { BillingService } from '../services/billing.service';
import { ListTransactionsDto } from '../dtos/transaction.dto';
import { BypassCreditCheck } from '@/src/decorators/bypass-credit.decorator';

@Controller('billing')
@UseGuards(AuthenticationGuard)
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('balance')
  @BypassCreditCheck()
  async getBalance(@Tenant() tenant: TenantType) {
    const balance = await this.billingService.getBalance(tenant.tenantId);
    return { data: balance };
  }

  @Post('transactions')
  @BypassCreditCheck()
  async listTransactions(
    @Tenant() tenant: TenantType,
    @Body() body: ListTransactionsDto,
  ) {
    return this.billingService.listTransactions(tenant.tenantId, body);
  }

  @Get('bank-details')
  @BypassCreditCheck()
  async getBankDetails() {
    return this.billingService.getBankDetails();
  }
}
