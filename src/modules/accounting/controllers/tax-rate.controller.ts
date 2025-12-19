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
import { TaxRateService } from '../services/tax-rate.service';
import { CreateTaxRateDto, UpdateTaxRateDto } from '../dtos/accounting.dto';

@ApiTags('Accounting - Tax Rates')
@Controller('accounting/tax-rate')
@UseGuards(AuthenticationGuard)
export class TaxRateController {
  constructor(private readonly taxRateService: TaxRateService) {}

  @Get()
  async list(@Query('activeOnly') activeOnly?: string) {
    return this.taxRateService.list(activeOnly === 'true');
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.taxRateService.get(id);
  }

  @Post('create')
  async create(@Body() body: CreateTaxRateDto) {
    return this.taxRateService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateTaxRateDto,
  ) {
    return this.taxRateService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.taxRateService.delete(id);
  }

  @Get('calculate/:amount/:taxRateId')
  async calculateTax(
    @Param('amount') amount: string,
    @Param('taxRateId', ParseIntPipe) taxRateId: number,
  ) {
    const taxAmount = await this.taxRateService.calculateTax(
      parseFloat(amount),
      taxRateId,
    );
    return { amount: parseFloat(amount), taxRateId, taxAmount };
  }
}
