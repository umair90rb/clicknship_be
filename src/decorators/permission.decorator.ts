import { SetMetadata } from '@nestjs/common';
import { Permission } from '@/src/modules/auth/dtos/role.dto';

export const PERMISSION_KEY = 'permissions';
export const Permissions = (permissions: Permission[]) =>
  SetMetadata(PERMISSION_KEY, permissions);
