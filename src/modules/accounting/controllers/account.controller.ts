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
import { AccountService } from '../services/account.service';
import {
  CreateAccountDto,
  UpdateAccountDto,
  AccountQueryDto,
} from '../dtos/accounting.dto';

@ApiTags('Accounting - Chart of Accounts')
@Controller('accounting/account')
@UseGuards(AuthenticationGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async list(@Query() query: AccountQueryDto) {
    return this.accountService.list(query);
  }

  @Get('initialize')
  async initializeDefaults() {
    return this.accountService.initializeDefaultAccounts();
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.accountService.get(id);
  }

  @Get(':id/balance')
  async getBalance(
    @Param('id', ParseIntPipe) id: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.accountService.getAccountBalance(
      id,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Post('create')
  async create(@Body() body: CreateAccountDto) {
    return this.accountService.create(body);
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateAccountDto,
  ) {
    return this.accountService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.accountService.delete(id);
  }
}
