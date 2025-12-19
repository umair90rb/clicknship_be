import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { RequestUser } from '@/src/decorators/user.decorator';
import { RequestUser as RequestUserType } from '@/src/types/auth';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentDto, PaymentQueryDto } from '../dtos/accounting.dto';

@ApiTags('Accounting - Payments')
@Controller('accounting/payment')
@UseGuards(AuthenticationGuard)
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  async list(@Query() query: PaymentQueryDto) {
    return this.paymentService.list(query);
  }

  @Get('summary')
  async getSummary(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.paymentService.getSummary(
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get('invoice/:invoiceId')
  async getByInvoice(@Param('invoiceId', ParseIntPipe) invoiceId: number) {
    return this.paymentService.getByInvoice(invoiceId);
  }

  @Get('bill/:billId')
  async getByBill(@Param('billId', ParseIntPipe) billId: number) {
    return this.paymentService.getByBill(billId);
  }

  @Get('order/:orderId')
  async getByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentService.getByOrder(orderId);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.paymentService.get(id);
  }

  @Post('create')
  async create(
    @RequestUser() user: RequestUserType,
    @Body() body: CreatePaymentDto,
  ) {
    return this.paymentService.create(body, user.id);
  }
}
