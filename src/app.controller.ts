import { Controller, Get, Req } from '@nestjs/common';

@Controller()
export class AppController {
  @Get('/health')
  healthCheck(@Req() req) {
    return { status: 'ok', tenant: req.tenant.tenantId };
  }
}
