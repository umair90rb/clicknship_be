import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from 'src/types/tenant';
import { RequestWithUser } from '../types/auth';

export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: RequestWithUser = ctx.switchToHttp().getRequest();
    return request?.user;
  },
);
