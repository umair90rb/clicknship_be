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
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrdersBodyDto } from './dto/list-order.dto';
import { OrderService } from './order.service';
import { RequestWithUser, RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { PostCommentDto } from './dto/post-comment.dto';
import { OrderCommentService } from './comment.service';
import { CreateItemDto, UpdateItemDto } from './dto/item.dto';
import { OrderItemService } from './item.service';
import { PostPaymentDto } from './dto/post-payment.dto';
import { OrderPaymentService } from './payment.service';
import { UpdateOrderStatusDto } from './dto/update-status.dto';

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
    @Body() body: CreateItemDto,
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
