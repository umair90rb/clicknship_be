import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Permissions } from 'src/decorators/permission.decorator';
import { AuthenticationGuard } from 'src/guards/authentication.guard';
import { AuthorizationGuard } from 'src/guards/authorization.guard';
import { CreateRoleDto } from '../dtos/role.dto';
import { Actions } from '../enums/actions.enum';
import { Resources } from '../enums/resources.enum';
import { RoleService } from '../services/role.service';
import { RESOURCES_PERMISSIONS_LIST } from '../constants/permission-list';

@UseGuards(AuthenticationGuard, AuthorizationGuard)
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Permissions([{ resource: Resources.roles, actions: [Actions.read] }])
  @Get('permissions')
  async permissions() {
    return RESOURCES_PERMISSIONS_LIST;
  }

  @Permissions([{ resource: Resources.roles, actions: [Actions.read] }])
  @Get('')
  async getAll() {
    return this.roleService.getAllRole();
  }

  @Permissions([{ resource: Resources.roles, actions: [Actions.read] }])
  @Get(':roleId')
  async get(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.roleService.getRole(roleId);
  }

  @Permissions([{ resource: Resources.roles, actions: [Actions.read] }])
  @Get(':roleId/permissions')
  async getPermissions(@Param('roleId', ParseIntPipe) roleId: number) {
    return this.roleService.getRolePermissions(roleId);
  }

  @Permissions([{ resource: Resources.roles, actions: [Actions.write] }])
  @Post()
  async create(@Body() role: CreateRoleDto) {
    return this.roleService.createRole(role);
  }

  @Permissions([{ resource: Resources.roles, actions: [Actions.write] }])
  @Put(':roleId')
  async update(
    @Param('roleId', ParseIntPipe) roleId,
    @Body() role: CreateRoleDto,
  ) {
    return this.roleService.updateRole(roleId, role);
  }

  @Permissions([{ resource: Resources.roles, actions: [Actions.delete] }])
  @Delete(':roleId')
  async delete(@Param('roleId', ParseIntPipe) roleId) {
    return this.roleService.deleteRole(roleId);
  }
}
