export function normalizeCustomerName(
  first_name: string | null,
  last_name?: string | null,
): string {
  let name = '';
  if (first_name) {
    name += first_name;
  }
  if (last_name) {
    name += ' ' + last_name;
  }
  return name.trim();
}
