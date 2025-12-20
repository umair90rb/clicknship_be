import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { InventoryReportsService } from '../services/inventory-reports.service';
import {
  InventoryReportFilterDto,
  StockMovementReportFilterDto,
  PurchaseOrderReportFilterDto,
  LowStockReportFilterDto,
} from '../dto/inventory-report-filters.dto';

@ApiTags('Reports - Inventory')
@ApiBearerAuth()
@Controller('reports/inventory')
@UseGuards(AuthenticationGuard)
export class InventoryReportsController {
  constructor(
    private readonly inventoryReportsService: InventoryReportsService,
  ) {}

  @Post('stock')
  @ApiOperation({
    summary: 'Stock Report',
    description:
      'Current stock levels by location/product with quantity, reserved, available, and valuation',
  })
  async getStockReport(@Body() filters: InventoryReportFilterDto) {
    return this.inventoryReportsService.getStockReport(filters);
  }

  @Post('stock-damaged')
  @ApiOperation({
    summary: 'Stock Damaged Report',
    description:
      'Damaged stock movements aggregated by product/location with movement details',
  })
  async getStockDamagedReport(@Body() filters: StockMovementReportFilterDto) {
    return this.inventoryReportsService.getStockDamagedReport(filters);
  }

  @Post('stock-expired')
  @ApiOperation({
    summary: 'Stock Expired Report',
    description:
      'Expired stock movements aggregated by product/location with movement details',
  })
  async getStockExpiredReport(@Body() filters: StockMovementReportFilterDto) {
    return this.inventoryReportsService.getStockExpiredReport(filters);
  }

  @Post('stock-movement')
  @ApiOperation({
    summary: 'Stock Movement Report',
    description:
      'All stock movements with filters by type (SALE, RETURN, ADJUSTMENT, PURCHASE, TRANSFER, DAMAGED, EXPIRED, etc.)',
  })
  async getStockMovementReport(@Body() filters: StockMovementReportFilterDto) {
    return this.inventoryReportsService.getStockMovementReport(filters);
  }

  @Post('low-stock')
  @ApiOperation({
    summary: 'Low Stock Report',
    description: 'Products below reorder point with suggested order quantities',
  })
  async getLowStockReport(@Body() filters: LowStockReportFilterDto) {
    return this.inventoryReportsService.getLowStockReport(filters);
  }

  @Post('purchase-order')
  @ApiOperation({
    summary: 'Purchase Order Report',
    description:
      'Purchase orders with status, supplier, amounts, and item counts',
  })
  async getPurchaseOrderReport(@Body() filters: PurchaseOrderReportFilterDto) {
    return this.inventoryReportsService.getPurchaseOrderReport(filters);
  }
}
