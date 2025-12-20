import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { AccountingReportsService } from '../services/accounting-reports.service';
import {
  RevenueReportFilterDto,
  InvoiceAgingFilterDto,
  CodRemittanceReportFilterDto,
  PaymentReportFilterDto,
  ProfitSummaryFilterDto,
} from '../dto/accounting-report-filters.dto';

@ApiTags('Reports - Accounting')
@ApiBearerAuth()
@Controller('reports/accounting')
@UseGuards(AuthenticationGuard)
export class AccountingReportsController {
  constructor(
    private readonly accountingReportsService: AccountingReportsService,
  ) {}

  @Post('revenue')
  @ApiOperation({
    summary: 'Revenue Report',
    description:
      'Sales revenue by period (day/week/month/quarter/year) with breakdown',
  })
  async getRevenueReport(@Body() filters: RevenueReportFilterDto) {
    return this.accountingReportsService.getRevenueReport(filters);
  }

  @Post('invoice-aging')
  @ApiOperation({
    summary: 'Invoice Aging Report',
    description:
      'Accounts receivable aging buckets (current, 30, 60, 90, 120+ days) by customer',
  })
  async getInvoiceAgingReport(@Body() filters: InvoiceAgingFilterDto) {
    return this.accountingReportsService.getInvoiceAgingReport(filters);
  }

  @Post('cod-remittance')
  @ApiOperation({
    summary: 'COD Remittance Report',
    description:
      'COD collections by courier service with amounts, charges, and status breakdown',
  })
  async getCodRemittanceReport(@Body() filters: CodRemittanceReportFilterDto) {
    return this.accountingReportsService.getCodRemittanceReport(filters);
  }

  @Post('payment')
  @ApiOperation({
    summary: 'Payment Report',
    description:
      'Payment transactions list with type, method, and linked documents',
  })
  async getPaymentReport(@Body() filters: PaymentReportFilterDto) {
    return this.accountingReportsService.getPaymentReport(filters);
  }

  @Post('profit-summary')
  @ApiOperation({
    summary: 'Profit Summary Report',
    description:
      'Revenue vs costs summary with gross profit, COGS, and profit margins',
  })
  async getProfitSummaryReport(@Body() filters: ProfitSummaryFilterDto) {
    return this.accountingReportsService.getProfitSummaryReport(filters);
  }
}
