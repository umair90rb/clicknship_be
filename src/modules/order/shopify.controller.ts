import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Tenant } from 'src/decorators/tenant.decorator';
import { Tenant as TTenant } from 'src/types/tenant';
import { OrderData } from './order.types';
import { ShopifyService } from './shopify.service';

@Controller('shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) {}
  @Post('order/create')
  create(
    @Tenant() tenant: TTenant,
    @Headers() headers: Headers,
    @Body() body: OrderData,
  ) {
    return this.shopifyService.createShopifyOrder(tenant, headers, body);
  }
}
