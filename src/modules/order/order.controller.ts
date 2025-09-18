import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Query,
  Patch,
  Delete,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrdersQueryDto } from './dto/list-order.dto';
import { OrderService } from './order.service';
import { RequestWithUser, RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';

@Controller('orders')
@UseGuards(AuthenticationGuard)
export class OrderController {
  constructor(private readonly ordersService: OrderService) {}

  @Get()
  async list(@Query() query: ListOrdersQueryDto) {
    const { skip, take, city, status } = query;

    return this.ordersService.list(parseInt(skip), parseInt(take), {
      city,
      status,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.find(id);
  }

  @Post()
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

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.delete(id);
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
}
