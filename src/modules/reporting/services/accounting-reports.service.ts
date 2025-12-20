import { Inject, Injectable } from '@nestjs/common';
import { TENANT_CONNECTION_PROVIDER } from '@/src/constants/common';
import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import { Prisma } from '@/prisma/tenant/client';
import {
  RevenueReportFilterDto,
  InvoiceAgingFilterDto,
  CodRemittanceReportFilterDto,
  PaymentReportFilterDto,
  ProfitSummaryFilterDto,
} from '../dto/accounting-report-filters.dto';
import {
  ReportResponse,
  RevenueReportRow,
  InvoiceAgingReportRow,
  CodRemittanceReportRow,
  PaymentReportRow,
  ProfitSummaryReportRow,
} from '../types/report.types';
import { OrderStatus } from '@/src/types/order';

@Injectable()
export class AccountingReportsService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  private getDateGroupClause(groupBy: string): string {
    switch (groupBy) {
      case 'week':
        return "DATE_TRUNC('week', created_at)::date";
      case 'month':
        return "DATE_TRUNC('month', created_at)::date";
      case 'quarter':
        return "DATE_TRUNC('quarter', created_at)::date";
      case 'year':
        return "DATE_TRUNC('year', created_at)::date";
      default:
        return 'created_at::date';
    }
  }

  // 1. Revenue Report
  async getRevenueReport(
    filters: RevenueReportFilterDto,
  ): Promise<ReportResponse<RevenueReportRow>> {
    const groupByClause = this.getDateGroupClause(filters.groupBy || 'day');

    // Build where conditions
    const conditions: string[] = [
      'deleted_at IS NULL',
      `status IN ('${OrderStatus.confirmed}', '${OrderStatus.booked}', '${OrderStatus.delivered}', '${OrderStatus.inTransit}', '${OrderStatus.dispatched}')`,
    ];
    const params: any[] = [];

    if (filters.dateRange?.start) {
      params.push(new Date(filters.dateRange.start));
      conditions.push(`created_at >= $${params.length}`);
    }
    if (filters.dateRange?.end) {
      params.push(new Date(filters.dateRange.end));
      conditions.push(`created_at <= $${params.length}`);
    }
    if (filters.brandId) {
      params.push(filters.brandId);
      conditions.push(`brand_id = $${params.length}`);
    }
    if (filters.channelId) {
      params.push(filters.channelId);
      conditions.push(`channel_id = $${params.length}`);
    }
    if (filters.status?.length) {
      const statusPlaceholders = filters.status
        .map((_, i) => `$${params.length + i + 1}`)
        .join(', ');
      params.push(...filters.status);
      conditions.push(`status IN (${statusPlaceholders})`);
    }

    const whereClause = conditions.join(' AND ');

    const query = `
      SELECT
        ${groupByClause} as period,
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(total_discount), 0) as discounts,
        COALESCE(SUM(shipping_charges), 0) as shipping_charges,
        COALESCE(SUM(total_tax), 0) as taxes,
        COALESCE(SUM(total_amount - COALESCE(total_discount, 0)), 0) as net_revenue,
        COUNT(id) as order_count
      FROM orders
      WHERE ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;

    const result = await this.prismaTenant.$queryRawUnsafe<any[]>(
      query,
      ...params,
    );

    const data: RevenueReportRow[] = result.map((row) => ({
      period: row.period ? row.period.toISOString().split('T')[0] : 'Unknown',
      grossRevenue: parseFloat(row.gross_revenue) || 0,
      discounts: parseFloat(row.discounts) || 0,
      shippingCharges: parseFloat(row.shipping_charges) || 0,
      taxes: parseFloat(row.taxes) || 0,
      netRevenue: parseFloat(row.net_revenue) || 0,
      orderCount: parseInt(row.order_count) || 0,
    }));

    return {
      data,
      meta: {
        total: data.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 2. Invoice Aging Report
  async getInvoiceAgingReport(
    filters: InvoiceAgingFilterDto,
  ): Promise<ReportResponse<InvoiceAgingReportRow>> {
    const asOfDate = filters.asOfDate ? new Date(filters.asOfDate) : new Date();
    const buckets = filters.agingBuckets || [30, 60, 90, 120];

    const where: any = {
      status: { in: ['SENT', 'PARTIAL', 'OVERDUE'] },
    };
    if (filters.customerId) where.customerId = filters.customerId;

    const invoices = await this.prismaTenant.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        issueDate: true,
        dueDate: true,
        totalAmount: true,
        paidAmount: true,
        customer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: 'asc' },
    });

    const customerAging = new Map<number, InvoiceAgingReportRow>();

    for (const inv of invoices) {
      if (!inv.customer) continue;

      const outstanding = inv.totalAmount - inv.paidAmount;
      if (outstanding <= 0) continue;

      const daysOverdue = inv.dueDate
        ? Math.max(
            0,
            Math.floor(
              (asOfDate.getTime() - new Date(inv.dueDate).getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          )
        : 0;

      if (!customerAging.has(inv.customer.id)) {
        customerAging.set(inv.customer.id, {
          customerId: inv.customer.id,
          customerName: inv.customer.name || 'Unknown',
          currentAmount: 0,
          bucket30: 0,
          bucket60: 0,
          bucket90: 0,
          bucket120Plus: 0,
          totalOutstanding: 0,
          invoices: [],
        });
      }

      const aging = customerAging.get(inv.customer.id)!;
      aging.totalOutstanding += outstanding;

      if (daysOverdue === 0) aging.currentAmount += outstanding;
      else if (daysOverdue <= 30) aging.bucket30 += outstanding;
      else if (daysOverdue <= 60) aging.bucket60 += outstanding;
      else if (daysOverdue <= 90) aging.bucket90 += outstanding;
      else aging.bucket120Plus += outstanding;

      aging.invoices.push({
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate.toISOString(),
        dueDate: inv.dueDate?.toISOString() || '',
        totalAmount: inv.totalAmount,
        paidAmount: inv.paidAmount,
        outstandingAmount: outstanding,
        daysOverdue,
      });
    }

    const data = Array.from(customerAging.values()).sort(
      (a, b) => b.totalOutstanding - a.totalOutstanding,
    );

    return {
      data,
      meta: {
        total: data.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 3. COD Remittance Report
  async getCodRemittanceReport(
    filters: CodRemittanceReportFilterDto,
  ): Promise<ReportResponse<CodRemittanceReportRow>> {
    const where: any = {};

    if (filters.courierServiceId)
      where.courierServiceId = filters.courierServiceId;
    if (filters.statuses?.length) where.status = { in: filters.statuses };
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.statementDate = {};
      if (filters.dateRange.start)
        where.statementDate.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.statementDate.lte = new Date(filters.dateRange.end);
    }

    const remittances = await this.prismaTenant.codRemittance.groupBy({
      by: ['courierServiceId', 'status'],
      where,
      _count: { id: true },
      _sum: {
        totalOrders: true,
        grossAmount: true,
        courierCharges: true,
        netAmount: true,
      },
    });

    const serviceIds = [...new Set(remittances.map((r) => r.courierServiceId))];
    const services = await this.prismaTenant.courierService.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, name: true, courier: true },
    });
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    const aggregated = new Map<number, CodRemittanceReportRow>();

    for (const row of remittances) {
      const service = serviceMap.get(row.courierServiceId);

      if (!aggregated.has(row.courierServiceId)) {
        aggregated.set(row.courierServiceId, {
          courierServiceId: row.courierServiceId,
          courierServiceName: service?.name || 'Unknown',
          courierName: service?.courier || 'Unknown',
          remittanceCount: 0,
          totalOrders: 0,
          grossAmount: 0,
          courierCharges: 0,
          netAmount: 0,
          pendingCount: 0,
          receivedCount: 0,
          reconciledCount: 0,
          disputedCount: 0,
        });
      }

      const agg = aggregated.get(row.courierServiceId)!;
      agg.remittanceCount += row._count.id;
      agg.totalOrders += row._sum.totalOrders || 0;
      agg.grossAmount += row._sum.grossAmount || 0;
      agg.courierCharges += row._sum.courierCharges || 0;
      agg.netAmount += row._sum.netAmount || 0;

      if (row.status === 'PENDING') agg.pendingCount += row._count.id;
      else if (row.status === 'RECEIVED') agg.receivedCount += row._count.id;
      else if (row.status === 'RECONCILED')
        agg.reconciledCount += row._count.id;
      else if (row.status === 'DISPUTED') agg.disputedCount += row._count.id;
    }

    return {
      data: Array.from(aggregated.values()),
      meta: {
        total: aggregated.size,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 4. Payment Report
  async getPaymentReport(
    filters: PaymentReportFilterDto,
  ): Promise<ReportResponse<PaymentReportRow>> {
    const where: any = {};

    if (filters.types?.length) where.type = { in: filters.types };
    if (filters.methods?.length) where.method = { in: filters.methods };
    if (filters.dateRange?.start || filters.dateRange?.end) {
      where.date = {};
      if (filters.dateRange.start)
        where.date.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        where.date.lte = new Date(filters.dateRange.end);
    }

    const payments = await this.prismaTenant.paymentRecord.findMany({
      where,
      select: {
        id: true,
        paymentNumber: true,
        date: true,
        type: true,
        method: true,
        amount: true,
        bankAccount: true,
        transactionRef: true,
        invoice: { select: { invoiceNumber: true } },
        bill: { select: { billNumber: true } },
        order: { select: { orderNumber: true } },
        user: { select: { id: true, name: true } },
      },
      orderBy: { date: 'desc' },
    });

    const result: PaymentReportRow[] = payments.map((p) => ({
      paymentId: p.id,
      paymentNumber: p.paymentNumber,
      date: p.date.toISOString(),
      type: p.type,
      method: p.method,
      amount: p.amount,
      invoiceNumber: p.invoice?.invoiceNumber || null,
      billNumber: p.bill?.billNumber || null,
      orderNumber: p.order?.orderNumber || null,
      bankAccount: p.bankAccount,
      transactionRef: p.transactionRef,
      userId: p.user?.id || null,
      userName: p.user?.name || null,
    }));

    return {
      data: result,
      meta: {
        total: result.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }

  // 5. Profit Summary Report
  async getProfitSummaryReport(
    filters: ProfitSummaryFilterDto,
  ): Promise<ReportResponse<ProfitSummaryReportRow>> {
    const groupByClause = this.getDateGroupClause(filters.groupBy || 'month');

    // Build where conditions for orders
    const orderConditions: string[] = [
      'deleted_at IS NULL',
      `status IN ('${OrderStatus.delivered}')`, // Only count delivered orders for profit
    ];
    const params: any[] = [];

    if (filters.dateRange?.start) {
      params.push(new Date(filters.dateRange.start));
      orderConditions.push(`created_at >= $${params.length}`);
    }
    if (filters.dateRange?.end) {
      params.push(new Date(filters.dateRange.end));
      orderConditions.push(`created_at <= $${params.length}`);
    }
    if (filters.brandId) {
      params.push(filters.brandId);
      orderConditions.push(`brand_id = $${params.length}`);
    }
    if (filters.channelId) {
      params.push(filters.channelId);
      orderConditions.push(`channel_id = $${params.length}`);
    }

    const whereClause = orderConditions.join(' AND ');

    // Get revenue from delivered orders
    const revenueQuery = `
      SELECT
        ${groupByClause} as period,
        COALESCE(SUM(total_amount), 0) as gross_revenue,
        COALESCE(SUM(shipping_charges), 0) as shipping_income
      FROM orders
      WHERE ${whereClause}
      GROUP BY ${groupByClause}
      ORDER BY period DESC
    `;

    const revenueResult = await this.prismaTenant.$queryRawUnsafe<any[]>(
      revenueQuery,
      ...params,
    );

    // Get COGS from inventory movements
    const cogsWhere: any = {
      type: 'SALE',
    };
    if (filters.dateRange?.start || filters.dateRange?.end) {
      cogsWhere.createdAt = {};
      if (filters.dateRange.start)
        cogsWhere.createdAt.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        cogsWhere.createdAt.lte = new Date(filters.dateRange.end);
    }

    const cogsMovements = await this.prismaTenant.inventoryMovement.findMany({
      where: cogsWhere,
      select: {
        quantity: true,
        costAtTime: true,
        createdAt: true,
      },
    });

    // Get courier charges from COD remittances
    const remittanceWhere: any = {};
    if (filters.dateRange?.start || filters.dateRange?.end) {
      remittanceWhere.statementDate = {};
      if (filters.dateRange.start)
        remittanceWhere.statementDate.gte = new Date(filters.dateRange.start);
      if (filters.dateRange.end)
        remittanceWhere.statementDate.lte = new Date(filters.dateRange.end);
    }

    const courierCharges = await this.prismaTenant.codRemittance.aggregate({
      where: remittanceWhere,
      _sum: { courierCharges: true },
    });

    // Map COGS by period
    const cogsMap = new Map<string, number>();
    for (const m of cogsMovements) {
      const period = m.createdAt.toISOString().split('T')[0];
      const cost = Math.abs(m.quantity) * (m.costAtTime || 0);
      cogsMap.set(period, (cogsMap.get(period) || 0) + cost);
    }

    // Calculate profit summary
    const totalCourierCosts = courierCharges._sum.courierCharges || 0;
    const totalPeriods = revenueResult.length || 1;
    const avgCourierCostPerPeriod = totalCourierCosts / totalPeriods;

    const data: ProfitSummaryReportRow[] = revenueResult.map((row) => {
      const period = row.period
        ? row.period.toISOString().split('T')[0]
        : 'Unknown';
      const grossRevenue = parseFloat(row.gross_revenue) || 0;
      const shippingIncome = parseFloat(row.shipping_income) || 0;
      const cogs = cogsMap.get(period) || 0;
      const courierCosts = avgCourierCostPerPeriod; // Distribute evenly (simplified)
      const grossProfit = grossRevenue - cogs;
      const netProfit = grossProfit + shippingIncome - courierCosts;
      const profitMargin =
        grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;

      return {
        period,
        grossRevenue,
        cogs,
        grossProfit,
        shippingIncome,
        courierCosts,
        netProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
      };
    });

    return {
      data,
      meta: {
        total: data.length,
        filters,
        generatedAt: new Date().toISOString(),
      },
    };
  }
}
