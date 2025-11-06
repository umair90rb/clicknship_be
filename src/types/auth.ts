import { type Request } from 'express';
import { Tenant } from './tenant';

export interface JwtTokenPayload {
  id: number;
}

export interface IRequestWithUser extends Request {
  user: JwtTokenPayload;
}

export interface User {
  id: number;
  email?: string;
  name?: string;
  phone?: string;
}

export type RequestUser = Pick<User, 'id' | 'email'>;

export interface RequestWithTenantAndUser extends Request {
  user: JwtTokenPayload;
  tenant: Tenant;
}
