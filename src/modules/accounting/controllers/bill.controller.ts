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
import { BillService } from '../services/bill.service';
import { CreateBillDto, UpdateBillDto, BillQueryDto } from '../dtos/accounting.dto';

@ApiTags('Accounting - Bills')
@Controller('accounting/bill')
@UseGuards(AuthenticationGuard)
export class BillController {
  constructor(private readonly billService: BillService) {}

  @Get()
  async list(@Query() query: BillQueryDto) {
    return this.billService.list(query);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.billService.get(id);
  }

  @Post('create')
  async create(@Body() body: CreateBillDto) {
    return this.billService.create(body);
  }

  @Post('from-purchase-order/:purchaseOrderId')
  async createFromPO(
    @Param('purchaseOrderId', ParseIntPipe) purchaseOrderId: number,
  ) {
    return this.billService.createFromPurchaseOrder(purchaseOrderId);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateBillDto,
  ) {
    return this.billService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.billService.delete(id);
  }
}
