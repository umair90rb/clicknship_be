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
import { RequestUser } from '@/src/decorators/user.decorator';
import { RequestUser as RequestUserType } from '@/src/types/auth';
import { PurchaseOrderService } from '../services/purchase-order.service';
import { PurchaseOrderStatus } from '../inventory.types';
import {
  CreatePurchaseOrderDto,
  UpdatePurchaseOrderDto,
  ReceivePurchaseOrderDto,
} from '../dtos/inventory.dto';

@ApiTags('Inventory - Purchase Orders')
@Controller('inventory/purchase-order')
@UseGuards(AuthenticationGuard)
export class PurchaseOrderController {
  constructor(private readonly purchaseOrderService: PurchaseOrderService) {}

  @Get()
  async list(@Query('status') status?: PurchaseOrderStatus) {
    return this.purchaseOrderService.list(status);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrderService.get(id);
  }

  @Post('create')
  async create(
    @RequestUser() user: RequestUserType,
    @Body() body: CreatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.create(body, user.id);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.update(id, body);
  }

  @Patch(':id/order')
  async markAsOrdered(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrderService.markAsOrdered(id);
  }

  @Post(':id/receive')
  async receive(
    @RequestUser() user: RequestUserType,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: ReceivePurchaseOrderDto,
  ) {
    return this.purchaseOrderService.receive(id, body, user.id);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrderService.cancel(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.purchaseOrderService.delete(id);
  }
}
