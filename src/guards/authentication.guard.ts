import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from 'src/modules/auth/auth.service';
import { JwtTokenPayload } from 'src/types/auth';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const tokenHeader = req.headers['authorization'];
    if (!tokenHeader) {
      throw new UnauthorizedException('No token provided');
    }
    const token = tokenHeader.split(' ')[1];
    if (!token) {
      throw new UnauthorizedException('Invalid token');
    }

    const payload: JwtTokenPayload = await this.authService.verifyToken(token);
    req.user = payload;
    return true;
  }
}
