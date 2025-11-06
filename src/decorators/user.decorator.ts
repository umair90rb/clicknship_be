import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestWithTenant } from 'src/types/tenant';
import { IRequestWithUser } from '../types/auth';

export const RequestUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request: IRequestWithUser = ctx.switchToHttp().getRequest();
    return request?.user;
  },
);
