#!/bin/bash
# This script will run db migration for all tenant databases

set -o allexport
source ./.env
set +o allexport

ENV=${1:-dev}
echo "Env: $ENV"
echo "Master DB: ${MASTER_DATABASE_URL}" 
echo "Server Connection String: ${TENANT_DATABASE_SERVER_URL}" 

QUERY="select db_name from public.tenants;"

echo "Getting tenants list..."
DB_LIST=$(psql ${MASTER_DATABASE_URL} -t -A -R ',' -c "${QUERY}") 
echo "Found tenants: ${DB_LIST}"

# Temporarily change IFS to a comma
IFS=","

SCHEMA_PATH=$(pwd)/prisma/tenant/schema
MIGRATE_TYPE=dev
if [[ "$ENV" == "prod" ]]; then
    MIGRATE_TYPE="deploy"
fi

for DB_NAME in $DB_LIST; do
  DB=$(echo "$TENANT_DATABASE_SERVER_URL" | sed "s/{database}/$DB_NAME/g")
  echo "Processing: $DB"
  
  export DATABASE_URL=$DB
  echo "Running migration..."
  # npx prisma migrate $MIGRATE_TYPE --schema $SCHEMA_PATH --skip-generate
  if ! npx prisma migrate $MIGRATE_TYPE --schema $SCHEMA_PATH --skip-generate; then
    echo "Migration failed"
    exit 1
  fi
  
  echo "Migrated $DB_NAME ✅"
done

unset IFS
