import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  Query,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { InvoiceService } from '../services/invoice.service';
import {
  CreateInvoiceDto,
  UpdateInvoiceDto,
  InvoiceQueryDto,
} from '../dtos/accounting.dto';

@ApiTags('Accounting - Invoices')
@Controller('accounting/invoice')
@UseGuards(AuthenticationGuard)
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  async list(@Query() query: InvoiceQueryDto) {
    return this.invoiceService.list(query);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.get(id);
  }

  @Post('create')
  async create(@Body() body: CreateInvoiceDto) {
    return this.invoiceService.create(body);
  }

  @Post('from-order/:orderId')
  async createFromOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.invoiceService.createFromOrder(orderId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateInvoiceDto,
  ) {
    return this.invoiceService.update(id, body);
  }

  @Patch(':id/send')
  async markAsSent(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.markAsSent(id);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.cancel(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.invoiceService.delete(id);
  }
}
