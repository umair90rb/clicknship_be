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
import { TransferService } from '../services/transfer.service';
import { TransferStatus } from '../inventory.types';
import { CreateTransferDto } from '../dtos/inventory.dto';

@ApiTags('Inventory - Stock Transfers')
@Controller('inventory/transfer')
@UseGuards(AuthenticationGuard)
export class TransferController {
  constructor(private readonly transferService: TransferService) {}

  @Get()
  async list(@Query('status') status?: TransferStatus) {
    return this.transferService.list(status);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.transferService.get(id);
  }

  @Post('create')
  async create(
    @RequestUser() user: RequestUserType,
    @Body() body: CreateTransferDto,
  ) {
    return this.transferService.create(body, user.id);
  }

  @Patch(':id/in-transit')
  async markInTransit(@Param('id', ParseIntPipe) id: number) {
    return this.transferService.markInTransit(id);
  }

  @Patch(':id/complete')
  async complete(
    @RequestUser() user: RequestUserType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.transferService.complete(id, user.id);
  }

  @Patch(':id/cancel')
  async cancel(@Param('id', ParseIntPipe) id: number) {
    return this.transferService.cancel(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.transferService.delete(id);
  }
}
