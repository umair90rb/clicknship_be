import { Controller, Post, Get, Body, Query, Param, Res, Logger } from '@nestjs/common';
import { Response } from 'express';
import { BillingService } from '../services/billing.service';
import { CreditService } from '../services/credit.service';
import { PaymentGatewayFactory } from '../gateways/gateway.factory';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Controller('billing')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(
    private readonly billingService: BillingService,
    private readonly creditService: CreditService,
    private readonly gatewayFactory: PaymentGatewayFactory,
  ) {}

  @Post('webhook/alfapay')
  async alfapayWebhook(@Body() body: any) {
    this.logger.log('AlfaPay webhook received:', JSON.stringify(body));

    try {
      const gateway = this.gatewayFactory.getGateway(PaymentMethod.alfapay);
      const result = await gateway.handleCallback(body);

      if (result.success && result.status === 'paid') {
        await this.processSuccessfulPayment(result.orderId, result.amount);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('AlfaPay webhook error:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('webhook/jazzcash')
  async jazzcashWebhook(@Body() body: any) {
    this.logger.log('JazzCash webhook received:', JSON.stringify(body));

    try {
      const gateway = this.gatewayFactory.getGateway(PaymentMethod.jazzcash);
      const result = await gateway.handleCallback(body);

      if (result.success && result.status === 'paid') {
        await this.processSuccessfulPayment(result.orderId, result.amount);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('JazzCash webhook error:', error);
      return { success: false, error: error.message };
    }
  }

  @Post('webhook/easypaisa')
  async easypaisaWebhook(@Body() body: any) {
    this.logger.log('Easypaisa webhook received:', JSON.stringify(body));

    try {
      const gateway = this.gatewayFactory.getGateway(PaymentMethod.easypaisa);
      const result = await gateway.handleCallback(body);

      if (result.success && result.status === 'paid') {
        await this.processSuccessfulPayment(result.orderId, result.amount);
      }

      return { success: true };
    } catch (error) {
      this.logger.error('Easypaisa webhook error:', error);
      return { success: false, error: error.message };
    }
  }

  @Get('callback/:method')
  async paymentCallback(
    @Param('method') method: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    this.logger.log(`Payment callback for ${method}:`, JSON.stringify(query));

    try {
      // Get payment request from query params
      const paymentRequestId = query.orderId || query.pp_TxnRefNo || query.orderRefNum;

      if (!paymentRequestId) {
        return res.redirect('/payment/failed?reason=missing_reference');
      }

      const paymentRequest = await this.billingService.getPaymentRequest(
        paymentRequestId.replace(/^(AP_|JC_|EP_)\d+_/, ''),
      );

      if (paymentRequest.status === PaymentStatus.completed) {
        return res.redirect('/payment/success');
      }

      // Verify payment status
      const gateway = this.gatewayFactory.getGateway(method as PaymentMethod);
      const result = await gateway.verifyPayment(paymentRequestId);

      if (result.status === 'paid') {
        await this.processSuccessfulPayment(paymentRequest.id, paymentRequest.amount);
        return res.redirect('/payment/success');
      }

      return res.redirect('/payment/pending');
    } catch (error) {
      this.logger.error('Payment callback error:', error);
      return res.redirect('/payment/failed?reason=error');
    }
  }

  private async processSuccessfulPayment(paymentRequestId: string, amount?: number) {
    const paymentRequest = await this.billingService.getPaymentRequest(paymentRequestId);

    if (paymentRequest.status === PaymentStatus.completed) {
      return; // Already processed
    }

    // Add credit to tenant
    await this.creditService.addCredit(
      paymentRequest.tenantId,
      amount || paymentRequest.amount,
      paymentRequest.paymentMethod,
      paymentRequest.id,
    );

    // Update payment request
    await this.billingService.updatePaymentRequest(paymentRequest.id, {
      status: PaymentStatus.completed,
      processedAt: new Date(),
    });

    this.logger.log(
      `Payment processed: ${paymentRequest.id}, Amount: ${amount || paymentRequest.amount}`,
    );
  }
}
