import { Body, Controller, Headers, Post } from '@nestjs/common';
import { Tenant } from 'src/decorators/tenant.decorator';
import { Tenant as TTenant } from 'src/types/tenant';

import { ShopifyService } from './shopify.service';
import { type OrderData } from '../order/order.types';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Webhook')
@Controller('shopify')
export class ShopifyController {
  constructor(private readonly shopifyService: ShopifyService) { }

  // @ApiBody({ schema: OrderData })
  @Post('order/create')
  create(
    @Tenant() tenant: TTenant,
    @Headers() headers: Headers,
    @Body() body: OrderData,
  ) {
    return this.shopifyService.createShopifyOrder(tenant, headers, body);
  }
}
