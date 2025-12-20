import { Controller, Post, Body, UseGuards, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthenticationGuard } from '@/src/guards/authentication.guard';
import { Tenant } from '@/src/decorators/tenant.decorator';
import { Tenant as TenantType } from '@/src/types/tenant';
import { BillingService } from '../services/billing.service';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { InitiateRechargeDto, BankTransferRechargeDto } from '../dtos/recharge.dto';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { S3Service } from '@/src/services/s3.service';
import { BypassCreditCheck } from '@/src/decorators/bypass-credit.decorator';

@Controller('billing/recharge')
@UseGuards(AuthenticationGuard)
@BypassCreditCheck()
export class RechargeController {
  constructor(
    private readonly billingService: BillingService,
    private readonly gatewayFactory: PaymentGatewayFactory,
    private readonly s3Service: S3Service,
  ) {}

  @Post('initiate')
  async initiateRecharge(
    @Tenant() tenant: TenantType,
    @Body() dto: InitiateRechargeDto,
    @Res() res: Response,
  ) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    const returnUrl = `${baseUrl}/api/v1/billing/callback/${dto.paymentMethod}`;
    const webhookUrl = `${baseUrl}/api/v1/billing/webhook/${dto.paymentMethod}`;

    // Create payment request
    const paymentRequest = await this.billingService.createPaymentRequest(
      tenant.tenantId,
      dto.amount,
      dto.paymentMethod,
    );

    const gateway = this.gatewayFactory.getGateway(dto.paymentMethod);

    const result = await gateway.initiatePayment({
      tenantId: tenant.tenantId,
      amount: dto.amount,
      orderId: paymentRequest.id,
      returnUrl,
      webhookUrl,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
    });

    if (!result.success) {
      await this.billingService.updatePaymentRequest(paymentRequest.id, {
        status: PaymentStatus.failed,
        gatewayResponse: { error: result.error },
      });

      return res.json({
        success: false,
        error: result.error,
      });
    }

    // Update payment request with gateway reference
    await this.billingService.updatePaymentRequest(paymentRequest.id, {
      gatewayRef: result.gatewayRef,
      status: PaymentStatus.processing,
    });

    // If HTML form, return it for redirect
    if (result.htmlForm) {
      return res.send(result.htmlForm);
    }

    // If redirect URL, return it
    return res.json({
      success: true,
      paymentRequestId: paymentRequest.id,
      redirectUrl: result.redirectUrl,
    });
  }

  @Post('bank-transfer')
  async bankTransferRecharge(
    @Tenant() tenant: TenantType,
    @Body() dto: BankTransferRechargeDto,
  ) {
    // Generate download URL for screenshot
    const screenshotUrl = await this.s3Service.generateDownloadUrl(dto.screenshotKey);

    // Create payment request for bank transfer
    const paymentRequest = await this.billingService.createPaymentRequest(
      tenant.tenantId,
      dto.amount,
      PaymentMethod.bank_transfer,
    );

    // Update with screenshot info
    await this.billingService.updatePaymentRequest(paymentRequest.id, {
      screenshotKey: dto.screenshotKey,
      screenshotUrl,
      gatewayResponse: { notes: dto.notes },
    });

    return {
      success: true,
      message: 'Bank transfer request submitted. Awaiting verification.',
      paymentRequestId: paymentRequest.id,
    };
  }

  @Post('upload-url')
  async getUploadUrl(@Tenant() tenant: TenantType) {
    const result = await this.s3Service.generateUploadUrl('bank-transfers', {
      fileName: `${tenant.tenantId}_${Date.now()}.jpg`,
      fileType: 'image',
      mimeType: 'image/jpeg',
      fileSize: 0,
    });

    return {
      success: true,
      uploadUrl: result.uploadUrl,
      key: result.key,
    };
  }
}
