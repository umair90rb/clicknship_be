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
echo "Server Connection String:" ${DATABASE_SERVER_URI} 

QUERY="select db_name from public.tenants;"

echo "getting dbs list"
DB_LIST=$(psql ${DATABASE_URI} -t -A -R ',' -c "${QUERY}") 
echo ${DB_LIST}

# Temporarily change IFS to a comma
IFS=","

SCHEMA_PATH=$(pwd)/src/prisma/schema.prisma
MIGRATE_TYPE=dev
if [[$ENV == "prod" ]]; then
    SCHEMA_PATH=$(pwd)/dist/prisma/schema.prisma
    MIGRATE_TYPE="deploy"
fi
# Loop through the string, treating commas as delimiters
for DB_NAME in $DB_LIST; do
  DB=$DATABASE_SERVER_URI/$DB_NAME
  echo "Processing: $DB"
  export DATABASE_URI=$DB
  npx prisma migrate $MIGRATE_TYPE --schema=$SCHEMA_PATH
done

# Reset IFS to its default value (important to avoid unexpected behavior later)
unset IFS
