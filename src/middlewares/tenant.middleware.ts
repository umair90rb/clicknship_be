import {
  BadRequestException,
  Injectable,
  NestMiddleware,
  NotFoundException,
} from '@nestjs/common';
import { stat } from 'fs';
import { TenantService } from 'src/modules/onboard/tenant.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}
  async use(req: any, res: any, next: () => void) {
    try {
      const host = req.headers.host;
      if (host === process.env.BASE_URL) {
        throw new BadRequestException('Tenant not provided!');
      }
      const tenantId = host.split('.')[0];
      const tenant = await this.tenantService.getTenantById(tenantId);
      if (!tenant) {
        throw new NotFoundException('Tenant does not exist!');
      }
      req.tenant = tenant;
      next();
    } catch (error) {
      console.error('Tenant Middleware Error:', error);
      return res.status(500).json({
        message: 'Something went wrong',
        statusCode: 500,
        success: false,
      });
    }
  }
}
