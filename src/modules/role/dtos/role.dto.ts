import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsEnum,
  IsNumber,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Actions } from '../../role/enums/actions.enum';
import { Resources } from '../../role/enums/resources.enum';

export class CreateRoleDto {
  @IsString()
  name: string;

  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => Permission)
  permissions: Permission[];
}

export class Permission {
  @IsEnum(Resources)
  resource: Resources;

  @IsEnum(Actions, { each: true })
  @ArrayUnique()
  @ArrayNotEmpty()
  actions: Actions[];
}

export class PermissionWithId extends Permission {
  @IsNumber()
  id?: number;
}

export class UpdateRoleDto {
  @IsString()
  name: string;

  @ArrayNotEmpty()
  @ValidateNested()
  @Type(() => PermissionWithId)
  permissions: PermissionWithId[];
}
