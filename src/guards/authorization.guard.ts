import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSION_KEY } from 'src/decorators/permission.decorator';
import { Permission } from 'src/modules/role/dtos/role.dto';
import { RoleService } from 'src/modules/role/role.service';

@Injectable()
export class AuthorizationGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly roleService: RoleService,
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
      throw new UnauthorizedException('User id not found');
    }
    try {
      const userPermissions = await this.roleService.getUserPermissions(userId);
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
    } catch (error) {
      Logger.error(error.message);
      throw new ForbiddenException();
    }

    return true;
  }
}
