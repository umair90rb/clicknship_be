import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { FiscalPeriodService } from '../services/fiscal-period.service';
import {
  CreateFiscalPeriodDto,
  UpdateFiscalPeriodDto,
} from '../dtos/accounting.dto';

@ApiTags('Accounting - Fiscal Periods')
@Controller('accounting/fiscal-period')
@UseGuards(AuthenticationGuard)
export class FiscalPeriodController {
  constructor(private readonly fiscalPeriodService: FiscalPeriodService) {}

  @Get()
  async list() {
    return this.fiscalPeriodService.list();
  }

  @Get('current')
  async getCurrent() {
    return this.fiscalPeriodService.getCurrentPeriod();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.fiscalPeriodService.get(id);
  }

  @Post('create')
  async create(@Body() body: CreateFiscalPeriodDto) {
    return this.fiscalPeriodService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateFiscalPeriodDto,
  ) {
    return this.fiscalPeriodService.update(id, body);
  }

  @Patch(':id/close')
  async close(@Param('id', ParseIntPipe) id: number) {
    return this.fiscalPeriodService.close(id);
  }

  @Patch(':id/reopen')
  async reopen(@Param('id', ParseIntPipe) id: number) {
    return this.fiscalPeriodService.reopen(id);
  }
}
