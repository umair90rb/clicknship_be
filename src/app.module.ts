import { MiddlewareConsumer, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AuthModule } from './modules/auth/auth.module';
import { TenantMiddleware } from './middlewares/tenant.middleware';
import { ProductModule } from './modules/product/product.module';
import { OnboardModule } from './modules/onboard/onboard.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({}),
    ConfigModule.forRoot(),
    AuthModule,
    ProductModule,
    OnboardModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).exclude('onboard').forRoutes('*');
  }
}
