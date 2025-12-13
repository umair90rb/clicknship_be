export function getTenantDbName(tenant: string) {
  return `tenant_${tenant.replace(/-/g, '_')}`;
}
