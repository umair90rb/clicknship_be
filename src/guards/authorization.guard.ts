import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from 'src/decorators/permission.decorator';
import { AuthService } from 'src/modules/auth/auth.service';
import { Permission } from 'src/modules/role/dtos/role.dto';
import { USER_ID_NOT_FOUND } from '../constants/errors';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authService: AuthService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();

    const routePermissions: Permission[] = this.reflector.getAllAndOverride(
      PERMISSION_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!routePermissions) return true;

    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException(USER_ID_NOT_FOUND);
    }
    const userPermissions = await this.authService.getUserPermissions(userId);
    if (
      !userPermissions ||
      (Array.isArray(userPermissions) && !userPermissions.length)
    ) {
      throw new ForbiddenException();
    }
    for (const routePermission of routePermissions) {
      const userPermission = userPermissions.find(
        (up) => up.resource === routePermission.resource,
      );
      if (!userPermission) throw new ForbiddenException();

      const allActionsAvailable = routePermission.actions.every((ra) =>
        userPermission.actions.includes(ra),
      );

      if (!allActionsAvailable) throw new ForbiddenException();
    }

    return true;
  }
}
