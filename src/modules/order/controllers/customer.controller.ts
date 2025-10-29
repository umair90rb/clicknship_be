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
import { RequestUser } from '@/src/types/auth';
import { RequestUser as RequestUserDeco } from '@/src/decorators/user.decorator';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { CustomerService } from '@/src/modules/order/services/customer.service';
import { SearchCustomerDto } from '@/src/modules/order/dto/customer.dto';

@Controller('customers')
@UseGuards(AuthenticationGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async list() {
    return this.customerService.list();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.customerService.get(id);
  }

  @Post('search')
  async search(@Body() body: SearchCustomerDto) {
    return this.customerService.find(body);
  }

  @Post('create')
  async create(@RequestUserDeco() user: RequestUser, @Body() createDto: any) {
    return this.customerService.create(user, createDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: any,
  ) {
    return this.customerService.update(user, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.customerService.delete(user, id);
  }
}
