import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { RequestUser } from '@/src/decorators/user.decorator';
import { JwtTokenPayload } from '@/src/types/auth';
import { BillingService } from '../services/billing.service';
import {
  ListBillingsDto,
  UpdateNegativeLimitDto,
  ListPaymentRequestsDto,
} from '../dtos/billing.dto';
import {
  ManualCreditDto,
  ConfirmBankTransferDto,
} from '../dtos/recharge.dto';
import { CreateBankDetailDto, UpdateBankDetailDto } from '../dtos/bank-detail.dto';
import { PaymentMethod } from '../enums/payment-method.enum';

@Controller('admin/billing')
@UseGuards(AuthenticationGuard)
export class AdminBillingController {
  constructor(private readonly billingService: BillingService) {}

  // === Tenant Billing Management ===

  @Post('list')
  async listBillings(@Body() body: ListBillingsDto) {
    return this.billingService.listAllBillings(body);
  }

  @Get(':tenantId')
  async getTenantBilling(@Param('tenantId') tenantId: string) {
    const billing = await this.billingService.getTenantBilling(tenantId);
    return { data: billing };
  }

  @Patch(':tenantId/limit')
  async updateNegativeLimit(
    @Param('tenantId') tenantId: string,
    @Body() dto: UpdateNegativeLimitDto,
  ) {
    return this.billingService.updateNegativeLimit(tenantId, dto);
  }

  @Post('manual-credit')
  async addManualCredit(
    @RequestUser() user: JwtTokenPayload,
    @Body() dto: ManualCreditDto,
  ) {
    return this.billingService.addManualCredit(
      dto.tenantId,
      dto.amount,
      dto.reason,
      user.id.toString(),
    );
  }

  // === Payment Requests ===

  @Post('payment-requests')
  async listPaymentRequests(@Body() body: ListPaymentRequestsDto) {
    return this.billingService.listPaymentRequests(body);
  }

  @Post('bank-transfers')
  async listBankTransfers(@Body() body: ListPaymentRequestsDto) {
    return this.billingService.listPaymentRequests({
      ...body,
      paymentMethod: PaymentMethod.bank_transfer,
    });
  }

  @Patch('bank-transfer/:id/approve')
  async approveBankTransfer(
    @Param('id') id: string,
    @RequestUser() user: JwtTokenPayload,
    @Body() dto: ConfirmBankTransferDto,
  ) {
    return this.billingService.approvePaymentRequest(
      id,
      user.id.toString(),
      dto.adminNotes,
    );
  }

  @Patch('bank-transfer/:id/reject')
  async rejectBankTransfer(
    @Param('id') id: string,
    @RequestUser() user: JwtTokenPayload,
    @Body() dto: ConfirmBankTransferDto,
  ) {
    return this.billingService.rejectPaymentRequest(
      id,
      user.id.toString(),
      dto.adminNotes,
    );
  }

  // === Bank Details Management ===

  @Get('bank-details/all')
  async getAllBankDetails() {
    return this.billingService.getAllBankDetails();
  }

  @Post('bank-details')
  async createBankDetail(@Body() dto: CreateBankDetailDto) {
    return this.billingService.createBankDetail(dto);
  }

  @Patch('bank-details/:id')
  async updateBankDetail(
    @Param('id') id: string,
    @Body() dto: UpdateBankDetailDto,
  ) {
    return this.billingService.updateBankDetail(id, dto);
  }
}
