import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { JwtTokenPayload } from 'src/types/auth';
import { INVALID_TOKEN, TOKEN_NOT_PRESENT } from '../constants/errors';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const req = context.switchToHttp().getRequest();
      const tokenHeader = req.headers['authorization'];
      if (!tokenHeader) {
        throw new UnauthorizedException(TOKEN_NOT_PRESENT);
      }
      const token = tokenHeader.split(' ')[1];
      if (!token) {
        throw new UnauthorizedException(INVALID_TOKEN);
      }

      const payload: JwtTokenPayload =
        await this.authService.verifyToken(token);
      req.user = payload;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error);
    }
  }
}
