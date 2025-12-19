import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  Delete,
  Query,
  Patch,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { RequestUser } from '@/src/decorators/user.decorator';
import { RequestUser as RequestUserType } from '@/src/types/auth';
import { JournalService } from '../services/journal.service';
import { CreateJournalEntryDto, JournalQueryDto } from '../dtos/accounting.dto';

@ApiTags('Accounting - Journal Entries')
@Controller('accounting/journal')
@UseGuards(AuthenticationGuard)
export class JournalController {
  constructor(private readonly journalService: JournalService) {}

  @Get()
  async list(@Query() query: JournalQueryDto) {
    return this.journalService.list(query);
  }

  @Get('trial-balance')
  async getTrialBalance(@Query('asOfDate') asOfDate?: string) {
    return this.journalService.getTrialBalance(
      asOfDate ? new Date(asOfDate) : undefined,
    );
  }

  @Get('ledger/:accountId')
  async getAccountLedger(
    @Param('accountId', ParseIntPipe) accountId: number,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.journalService.getAccountLedger(
      accountId,
      fromDate ? new Date(fromDate) : undefined,
      toDate ? new Date(toDate) : undefined,
    );
  }

  @Get(':id')
  async get(@Param('id', ParseIntPipe) id: number) {
    return this.journalService.get(id);
  }

  @Post('create')
  async create(
    @RequestUser() user: RequestUserType,
    @Body() body: CreateJournalEntryDto,
  ) {
    return this.journalService.create(body, user.id);
  }

  @Patch(':id/post')
  async post(@Param('id', ParseIntPipe) id: number) {
    return this.journalService.post(id);
  }

  @Patch(':id/reverse')
  async reverse(
    @RequestUser() user: RequestUserType,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.journalService.reverse(id, user.id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.journalService.delete(id);
  }
}
