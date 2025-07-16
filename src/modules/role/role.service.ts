import { Inject, Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateRoleDto, Permission } from './dtos/role.dto';

@Injectable()
export class RoleService {
  constructor(@Inject('TENANT_CONNECTION') private prisma: PrismaClient) {}

  async create(role: CreateRoleDto) {
    return this.prisma.role.create({
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
  async getUserPermissions(userId: string): Promise<Permission[]> {
    return Promise.resolve([]);
  }
}
