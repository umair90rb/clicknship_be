import { type Request } from 'express';

export class JwtTokenPayload {
  email: string;
  id: number | string;
}

export class RequestWithUser extends Request {
  user: JwtTokenPayload;
}

export class User {
  id: number | string;
  email: string;
  name: string;
  phone: string;
}
