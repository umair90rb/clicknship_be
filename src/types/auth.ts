import { type Request } from 'express';
import { Tenant } from './tenant';

export class JwtTokenPayload {
  email: string;
  id: number;
}

export class RequestWithUser extends Request {
  user: JwtTokenPayload;
}

export class User {
  id: number;
  email?: string;
  name?: string;
  phone?: string;
}

export type RequestUser = Pick<User, 'id' | 'email'>;

export class RequestWithTenantAndUser extends Request {
  user: JwtTokenPayload;
  tenant: Tenant;
}
