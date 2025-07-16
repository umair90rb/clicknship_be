import { ArrayUnique, IsEnum, IsString, ValidateNested } from 'class-validator';
import { Resources } from '../../role/enums/resources.enum';
import { Actions } from '../../role/enums/actions.enum';
import { Type } from 'class-transformer';

export class CreateRoleDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => Permission)
  permissions: Permission[];
}

export class Permission {
  @IsEnum(Resources)
  resource: Resources;

  @IsEnum(Actions, { each: true })
  @ArrayUnique()
  actions: Actions[];
}
