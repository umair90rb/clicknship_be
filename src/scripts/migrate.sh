#!/bin/bash
# This script will run db migration for all databases

# Exit on error
# set -e
# Enable automatic export of variables
set -o allexport

# Source the .env file
source ./.env

# Disable automatic export
set +o allexport
ENV=${1:-dev}
echo "Env: "$ENV
echo "Master DB:" ${DATABASE_URI} 
echo "Server Connection String:" ${TENANT_DATABASE_SERVER_URL} 

QUERY="select db_name from public.tenants;"

echo "getting dbs list"
DB_LIST=$(psql ${DATABASE_URI} -t -A -R ',' -c "${QUERY}") 
echo ${DB_LIST}

# Temporarily change IFS to a comma
IFS=","

SCHEMA_PATH=$(pwd)/prisma/tenant/schema/
MIGRATE_TYPE=dev
if [[ "$ENV" == "prod" ]]; then
    MIGRATE_TYPE="deploy"
fi
# Loop through the string, treating commas as delimiters
for DB_NAME in $DB_LIST; do
  DB=$TENANT_DATABASE_SERVER_URL/$DB_NAME
  echo "Processing: $DB"
  export DATABASE_URI=$DB
  echo "running migration..."
  npx prisma migrate $MIGRATE_TYPE --schema $SCHEMA_PATH --skip-generate
  echo "migrated"
done

# Reset IFS to its default value (important to avoid unexpected behavior later)
unset IFS
