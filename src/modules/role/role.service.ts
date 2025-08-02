import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SUPER_ADMIN_ROLE } from 'src/constants/common';
import {
  CreateRoleDto,
  Permission,
  PermissionWithId,
  UpdateRoleDto,
} from './dtos/role.dto';

@Injectable()
export class RoleService {
  constructor(@Inject('TENANT_CONNECTION') private prisma: PrismaClient) {}

  async getAllRole() {
    return this.prisma.role.findMany({
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
    const role = await this.prisma.role.findFirst({
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
    return this.prisma.permission.findMany({
      where: { roleId },
      select: {
        resource: true,
        actions: true,
      },
    });
  }

  async createRole(role: CreateRoleDto) {
    return this.prisma.role.create({
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
    return this.prisma.role.update({
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
    const role = await this.prisma.role.findFirst({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException();
    }
    await this.prisma.role.delete({ where: { id: role.id } });
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
