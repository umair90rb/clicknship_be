import { PrismaClient as PrismaTenantClient } from '@/prisma/tenant/client';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  SUPER_ADMIN_ROLE,
  TENANT_CONNECTION_PROVIDER,
} from 'src/constants/common';
import {
  CreateRoleDto,
  Permission,
  PermissionWithId,
  UpdateRoleDto,
} from '../dtos/role.dto';

@Injectable()
export class RoleService {
  constructor(
    @Inject(TENANT_CONNECTION_PROVIDER)
    private prismaTenant: PrismaTenantClient,
  ) {}

  async getAll() {
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

  async get(roleId: number) {
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

  async create(role: CreateRoleDto) {
    const existed = await this.prismaTenant.role.findFirst({
      where: { name: role.name },
    });
    if (existed) {
      throw new BadRequestException('Duplicate role name not allowed');
    }
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

  async update(roleId: number, role: UpdateRoleDto) {
    this.isSuperAdmin(roleId);
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

  async delete(roleId: number) {
    this.isSuperAdmin(roleId);
    const role = await this.prismaTenant.role.findFirst({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException('Role not found');
    }
    await this.prismaTenant.permission.deleteMany({ where: { roleId } });
    await this.prismaTenant.role.delete({ where: { id: role.id } });
    return role;
  }

  isSuperAdmin(roleId: number): void {
    if (roleId === 1) {
      throw new BadRequestException(
        `${SUPER_ADMIN_ROLE} can't be deleted or updated`,
      );
    }
  }
}
