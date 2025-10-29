import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { AuthModule } from './modules/auth/auth.module';
import { OnboardModule } from './modules/onboard/onboard.module';
import { OrderModule } from './modules/order/order.module';
import { RoleModule } from './modules/role/role.module';
import { WebhookModule } from './modules/webhook/webhook.module';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forRoot(),
    BullModule.forRoot({ connection: { url: process.env.REDIS_URL } }),
    AuthModule,
    OnboardModule,
    RoleModule,
    OrderModule,
    WebhookModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).exclude('onboard').forRoutes('*');
  }
}
