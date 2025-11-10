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
import {
  CreateSalesChannelDto,
  UpdateSalesChannelDto,
} from '../dto/sales-channel.dto';
import { SalesChannelService } from '../services/sales-channel.service';

@Controller('sales-channel')
@UseGuards(AuthenticationGuard)
export class UnitController {
  constructor(private readonly salesChannelService: SalesChannelService) {}

  @Get()
  async list() {
    return this.salesChannelService.list();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.salesChannelService.get(id);
  }

  @Post('create')
  async create(
    @RequestUserDeco() user: RequestUser,
    @Body() createDto: CreateSalesChannelDto,
  ) {
    return this.salesChannelService.create(user, createDto);
  }

  @Patch(':id')
  async update(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSalesChannelDto,
  ) {
    return this.salesChannelService.update(user, id, updateDto);
  }

  @Delete(':id')
  async remove(
    @RequestUserDeco() user: RequestUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.salesChannelService.delete(user, id);
  }
}
