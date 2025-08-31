import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from 'src/types/tenant';

export const Tenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: RequestWithTenant = ctx.switchToHttp().getRequest();
    return request.tenant;
  },
);
