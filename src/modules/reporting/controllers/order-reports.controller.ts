import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { OrderReportsService } from '../services/order-reports.service';
import {
  AgentReportFilterDto,
  ProductReportFilterDto,
  CourierReportFilterDto,
  WebhookReportFilterDto,
  FocReportFilterDto,
  BookedProductValueFilterDto,
} from '../dto/order-report-filters.dto';
import { BaseReportFilterDto } from '../dto/base-filter.dto';

@ApiTags('Reports - Orders')
@ApiBearerAuth()
@Controller('reports/orders')
@UseGuards(AuthenticationGuard)
export class OrderReportsController {
  constructor(private readonly orderReportsService: OrderReportsService) {}

  @Post('agent-order')
  @ApiOperation({
    summary: 'Agent Order Report',
    description:
      'Per user: name, total orders, confirmed/assigned/no_pick/payment_pending/cancel/delivered counts',
  })
  async getAgentOrderReport(@Body() filters: AgentReportFilterDto) {
    return this.orderReportsService.getAgentOrderReport(filters);
  }

  @Post('product-unit')
  @ApiOperation({
    summary: 'Product Unit Report',
    description:
      'Per product: name, total units, confirmed/no_pick/cancel units by order status',
  })
  async getProductUnitReport(@Body() filters: ProductReportFilterDto) {
    return this.orderReportsService.getProductUnitReport(filters);
  }

  @Post('booking-unit')
  @ApiOperation({
    summary: 'Booking Unit Report',
    description:
      'Per product: confirmed/booked/booking_error units, delivered units per courier service',
  })
  async getBookingUnitReport(@Body() filters: ProductReportFilterDto) {
    return this.orderReportsService.getBookingUnitReport(filters);
  }

  @Post('foc-unit')
  @ApiOperation({
    summary: 'FOC Unit Report',
    description:
      'Per product with unitPrice=0: total FOC units, delivered per courier',
  })
  async getFocUnitReport(@Body() filters: FocReportFilterDto) {
    return this.orderReportsService.getFocUnitReport(filters);
  }

  @Post('agent-channel')
  @ApiOperation({
    summary: 'Agent Channel Report',
    description:
      'Per channel+user: orders, COD amount, product counts for confirmed/duplicate orders',
  })
  async getAgentChannelReport(@Body() filters: AgentReportFilterDto) {
    return this.orderReportsService.getAgentChannelReport(filters);
  }

  @Post('channel-order')
  @ApiOperation({
    summary: 'Channel Order Report',
    description: 'Per channel: order/product counts by status',
  })
  async getChannelOrderReport(@Body() filters: BaseReportFilterDto) {
    return this.orderReportsService.getChannelOrderReport(filters);
  }

  @Post('user-incentive')
  @ApiOperation({
    summary: 'User Incentive Report',
    description:
      'Per user+product: confirmed/delivered counts, incentive per unit, total incentive earned',
  })
  async getUserIncentiveReport(@Body() filters: AgentReportFilterDto) {
    return this.orderReportsService.getUserIncentiveReport(filters);
  }

  @Post('courier-delivery')
  @ApiOperation({
    summary: 'Courier Delivery Report',
    description:
      'Per courier account: booked/delivered/in_transit/returned/booking_error/canceled counts',
  })
  async getCourierDeliveryReport(@Body() filters: CourierReportFilterDto) {
    return this.orderReportsService.getCourierDeliveryReport(filters);
  }

  @Post('courier-dispatch')
  @ApiOperation({
    summary: 'Courier Dispatch Report',
    description: 'Per courier account: total booked orders count',
  })
  async getCourierDispatchReport(@Body() filters: CourierReportFilterDto) {
    return this.orderReportsService.getCourierDispatchReport(filters);
  }

  @Post('channel-order-generation')
  @ApiOperation({
    summary: 'Channel Order Generation Report',
    description:
      'Per Shopify domain: orders count, total units from webhook logs',
  })
  async getChannelOrderGenerationReport(
    @Body() filters: WebhookReportFilterDto,
  ) {
    return this.orderReportsService.getChannelOrderGenerationReport(filters);
  }

  @Post('booked-product-value')
  @ApiOperation({
    summary: 'Booked Product Value Report',
    description:
      'Per product in booked orders: name, unit_price, quantity, total_value',
  })
  async getBookedProductValueReport(
    @Body() filters: BookedProductValueFilterDto,
  ) {
    return this.orderReportsService.getBookedProductValueReport(filters);
  }
}
