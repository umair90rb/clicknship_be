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
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { SupplierService } from '../services/supplier.service';
import { CreateSupplierDto, UpdateSupplierDto } from '../dtos/inventory.dto';

@ApiTags('Inventory - Suppliers')
@Controller('inventory/supplier')
@UseGuards(AuthenticationGuard)
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  async list() {
    return this.supplierService.list();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.get(id);
  }

  @Post('create')
  async create(@Body() createDto: CreateSupplierDto) {
    return this.supplierService.create(createDto);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSupplierDto,
  ) {
    return this.supplierService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.supplierService.delete(id);
  }
}
