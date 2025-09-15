import {
    Controller,
    Post,
    Body,
    Param,
    Get,
    Query,
    Put,
    Patch,
    Delete,
    ParseIntPipe,
    DefaultValuePipe,
    ParseBoolPipe,
    ValidationPipe,
    UsePipes,
} from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { ListOrdersQueryDto } from './dto/list-order.dto';
import { OrderService } from './order.service';

@Controller('orders')
export class OrderController {
    constructor(private readonly ordersService: OrderService) { }

    @Post()
    async create(@Body() createDto: CreateOrderDto) {
        return this.ordersService.create(createDto);
    }

    @Get()
    async list(@Query() query: ListOrdersQueryDto) {
        const page = query.page ? parseInt(query.page, 10) : 1;
        const pageSize = query.pageSize ? parseInt(query.pageSize, 10) : 20;

        return this.ordersService.list({
            page,
            pageSize,
            status: query.status,
            city: query.city,
            orderNumber: query.orderNumber,
            customerName: query.customerName,
            customerPhone: query.customerPhone,
        });
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.findOne(id);
    }

    // Full replace: expects complete data shape (similar shape to CreateOrderDto)
    @Put(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async replace(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: CreateOrderDto, // full
    ) {
        return this.ordersService.updateFull(id, updateDto);
    }

    // Partial update: update only provided fields
    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateDto: UpdateOrderDto,
    ) {
        return this.ordersService.updatePartial(id, updateDto);
    }

    @Delete(':id')
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.ordersService.softDelete(id);
    }
}
