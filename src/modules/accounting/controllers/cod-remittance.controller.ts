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
import { CodRemittanceService } from '../services/cod-remittance.service';
import {
  CreateCodRemittanceDto,
  UpdateCodRemittanceStatusDto,
  CodRemittanceQueryDto,
} from '../dtos/accounting.dto';

@ApiTags('Accounting - COD Remittance')
@Controller('accounting/cod-remittance')
@UseGuards(AuthenticationGuard)
export class CodRemittanceController {
  constructor(private readonly codRemittanceService: CodRemittanceService) {}

  @Get()
  async list(@Query() query: CodRemittanceQueryDto) {
    return this.codRemittanceService.list(query);
  }

  @Get('summary')
  async getSummary(
    @Query('courierServiceId') courierServiceId?: string,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.codRemittanceService.getSummary(
      courierServiceId ? parseInt(courierServiceId) : undefined,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get('order/:orderId')
  async getByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.codRemittanceService.getByOrder(orderId);
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.codRemittanceService.get(id);
  }

  @Post('create')
  async create(
    @RequestUser() user: RequestUserType,
    @Body() body: CreateCodRemittanceDto,
  ) {
    return this.codRemittanceService.create(body, user.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @RequestUser() user: RequestUserType,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCodRemittanceStatusDto,
  ) {
    return this.codRemittanceService.updateStatus(id, body, user.id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.codRemittanceService.delete(id);
  }
}
