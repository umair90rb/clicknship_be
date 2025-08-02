import { Actions } from '../enums/actions.enum';
import { Resources } from '../enums/resources.enum';

export type ResourcesPermissionsList = {
  resource: Resources;
  actions: Actions[];
};

export const RESOURCES_PERMISSIONS_LIST: ResourcesPermissionsList[] = [
  {
    resource: Resources.dashboard,
    actions: [Actions.read, Actions.write, Actions.delete],
  },
  {
    resource: Resources.settings,
    actions: [Actions.read, Actions.write, Actions.delete],
  },
  {
    resource: Resources.products,
    actions: [Actions.read, Actions.write, Actions.delete],
  },
  {
    resource: Resources.users,
    actions: [Actions.read, Actions.write, Actions.delete],
  },
  {
    resource: Resources.roles,
    actions: [Actions.read, Actions.write, Actions.delete],
  },
];
