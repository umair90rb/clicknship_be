import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardModule } from './modules/onboard/onboard.module';
import { OrderModule } from './modules/order/order.module';
import { WebhookModule } from './modules/webhook/webhook.module';
import { SettingsModule } from './modules/settings/settings.module';
import { LogisticModule } from './modules/logistic/logistic.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { AccountingModule } from './modules/accounting/accounting.module';
import { ReportingModule } from './modules/reporting/reporting.module';
import { SupportModule } from './modules/support/support.module';
import { BillingModule } from './modules/billing/billing.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forRoot(),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
    ScheduleModule.forRoot(),
    AuthModule,
    OnboardModule,
    OrderModule,
    WebhookModule,
    SettingsModule,
    LogisticModule,
    InventoryModule,
    AccountingModule,
    ReportingModule,
    SupportModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TenantMiddleware)
      .exclude('onboard', 'billing/webhook/(.*)', 'billing/callback/(.*)')
      .forRoutes('*');
  }
}
