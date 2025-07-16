import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dtos/role.dto';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { Permissions } from 'src/decorators/permission.decorator';
import { Resources } from './enums/resources.enum';
import { Actions } from './enums/actions.enum';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Permissions([{ resource: Resources.roles, actions: [Actions.create] }])
  @Post()
  async create(@Body() role: CreateRoleDto) {
    return this.roleService.create(role);
  }
}
