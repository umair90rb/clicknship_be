export function getDbUrl(dbName: string) {
  if (!dbName) {
    throw new Error('Database name not provided!');
  }
  const serverUrl = process.env.TENANT_DATABASE_SERVER_URL;
  if (!serverUrl) {
    throw new Error(
      'Database server url not found! Verify env is setup properly',
    );
  }

  return serverUrl.replace('{database}', dbName);
}
