import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  Delete,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import {
  CreateOrderDto,
  UpdateOrderDto,
  ListOrdersBodyDto,
  CreateOrderPaymentDto,
  CreateOrderCommentDto,
  UpdateOrderStatusDto,
  CreateOrderItemDto,
  UpdateOrderItemDto,
} from '@/src/modules/order/dto/order.dto';
import { RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { Tenant as TenantDeco } from '@/src/decorators/tenant.decorator';
import { Tenant } from '@/src/types/tenant';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { OrderService } from '@/src/modules/order/services/order.service';
import { OrderCommentService } from '@/src/modules/order/services/comment.service';
import { OrderItemService } from '@/src/modules/order/services/item.service';
import { OrderPaymentService } from '@/src/modules/order/services/payment.service';

@Controller('orders')
@UseGuards(AuthenticationGuard)
export class OrderController {
  constructor(
    private readonly ordersService: OrderService,
    private readonly commentService: OrderCommentService,
    private readonly itemService: OrderItemService,
    private readonly paymentService: OrderPaymentService,
  ) {}

  @Post()
  async list(@Body() body: ListOrdersBodyDto) {
    return this.ordersService.list(body);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.find(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @TenantDeco() tenant: Tenant,
    @Body() createDto: CreateOrderDto,
  ) {
    return this.ordersService.create(user, tenant.tenantId, createDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(user, id, updateDto);
  }

  @Patch(':id/status')
  async status(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() { status }: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateStatus(user, [id], status);
  }

  @Post(':id/comment')
  async comment(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: CreateOrderCommentDto,
  ) {
    return this.commentService.create(orderId, body, user);
  }

  @Post(':id/item')
  async item(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: CreateOrderItemDto,
  ) {
    return this.itemService.create(orderId, body, user);
  }

  @Patch(':id/item/:itemId')
  async updatedItem(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: UpdateOrderItemDto,
  ) {
    return this.itemService.update(orderId, itemId, body, user);
  }

  @Delete(':id/item/:itemId')
  async deleteItem(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.itemService.delete(orderId, itemId, user);
  }

  @Post(':id/payment')
  async payment(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: CreateOrderPaymentDto,
  ) {
    return this.paymentService.create(orderId, body, user);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.delete(user, id);
  }
}
