import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SUPER_ADMIN_ROLE } from 'src/constants/common';
import {
  CreateRoleDto,
  Permission,
  PermissionWithId,
  UpdateRoleDto,
} from './dtos/role.dto';

@Injectable()
export class RoleService {
  constructor(
    @Inject('TENANT_CONNECTION') private prismaTenant: PrismaTenantClient,
  ) {}

  async getAllRole() {
    return this.prismaTenant.role.findMany({
      include: {
        permissions: {
          select: {
            resource: true,
            actions: true,
          },
        },
      },
    });
  }

  async getRole(roleId: number) {
    const role = await this.prismaTenant.role.findFirst({
      where: { id: roleId },
      include: {
        permissions: {
          select: {
            id: true,
            resource: true,
            actions: true,
          },
        },
      },
    });

    if (!role) {
      throw new NotFoundException();
    }
    return role;
  }

  async getRolePermissions(
    roleId: number,
  ): Promise<{ resource: string; actions: string[] }[]> {
    return this.prismaTenant.permission.findMany({
      where: { roleId },
      select: {
        resource: true,
        actions: true,
      },
    });
  }

  async createRole(role: CreateRoleDto) {
    return this.prismaTenant.role.create({
      include: {
        permissions: {
          select: {
            resource: true,
            actions: true,
          },
        },
      },
      data: {
        name: role.name,
        permissions: {
          create: role.permissions.map((permission) => ({
            resource: permission.resource,
            actions: permission.actions,
          })),
        },
      },
    });
  }

  async updateRole(roleId: number, role: UpdateRoleDto) {
    this.isRoleSuperAdmin(roleId);
    const newPermissions: Permission[] = [],
      existingPermissions: PermissionWithId[] = [];
    for (let index = 0; index < role.permissions.length; index++) {
      const permission = role.permissions[index];
      if ('id' in permission) {
        existingPermissions.push(permission);
      } else {
        newPermissions.push(permission);
      }
    }
    return this.prismaTenant.role.update({
      where: {
        id: roleId,
      },
      data: {
        name: role.name,
        permissions: {
          update: existingPermissions.map((permission) => ({
            where: { id: permission.id },
            data: {
              resource: permission.resource,
              actions: permission.actions,
            },
          })),
          createMany: { data: newPermissions },
        },
      },
      include: {
        permissions: true,
      },
    });
  }

  async deleteRole(roleId: number) {
    this.isRoleSuperAdmin(roleId);
    const role = await this.prismaTenant.role.findFirst({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException();
    }
    await this.prismaTenant.role.delete({ where: { id: role.id } });
    return role;
  }

  isRoleSuperAdmin(roleId: number): void {
    if (roleId === 1) {
      throw new BadRequestException(
        `${SUPER_ADMIN_ROLE} can't be deleted or updated`,
      );
    }
  }
}
