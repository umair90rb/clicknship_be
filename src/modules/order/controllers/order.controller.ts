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
import { CreateOrderDto } from '@/src/modules/order/dto/create-order.dto';
import { UpdateOrderDto } from '@/src/modules/order/dto/update-order.dto';
import { ListOrdersBodyDto } from '@/src/modules/order/dto/list-order.dto';
import { RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { PostCommentDto } from '@/src/modules/order/dto/post-comment.dto';
import { CreateItemDto, UpdateItemDto } from '@/src/modules/order/dto/item.dto';
import { PostPaymentDto } from '@/src/modules/order/dto/post-payment.dto';
import { UpdateOrderStatusDto } from '@/src/modules/order/dto/update-status.dto';
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
    @Body() createDto: CreateOrderDto,
  ) {
    return this.ordersService.create(user, createDto);
  }

  // Partial update: update only provided fields
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
    return this.ordersService.updateStatus(user, id, status);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.ordersService.delete(user, id);
  }

  // Full replace: expects complete data shape (similar shape to CreateOrderDto)
  //   @Put(':id')
  //   @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  //   async replace(
  //     @Param('id', ParseIntPipe) id: number,
  //     @Body() updateDto: CreateOrderDto, // full
  //   ) {
  //     return this.ordersService.update(id, updateDto);
  //   }

  // Partial update: update only provided fields
  @Post(':id/comment')
  async comment(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: PostCommentDto,
  ) {
    return this.commentService.create(orderId, body, user);
  }

  @Post(':id/item')
  async item(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Body() body: CreateItemDto,
  ) {
    return this.itemService.create(orderId, body, user);
  }

  @Patch(':id/item/:itemId')
  async updatedItem(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) orderId: number,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() body: UpdateItemDto,
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
    @Body() body: PostPaymentDto,
  ) {
    return this.paymentService.create(orderId, body, user);
  }
}
