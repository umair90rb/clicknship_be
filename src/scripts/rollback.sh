#!/bin/bash
# This script will roll back a specific database migration for all databases.

# Exit immediately if a command exits with a non-zero status.
set -e
# Enable automatic export of variables sourced from the environment file.
set -o allexport

# Source the .env file to load database connection details.
source ./.env

# Disable automatic export to prevent environment pollution.
set +o allexport

# The name of the migration to roll back must be provided as a command-line argument.
MIGRATION_NAME=${1}

# Check if the migration name was provided.
if [[ -z "$MIGRATION_NAME" ]]; then
    echo "Error: Please provide the migration name as a command-line argument."
    echo "Usage: ./rollback-migration.sh <migration-name>"
    exit 1
fi

echo "Master DB: ${DATABASE_URI}"
echo "Server Connection String: ${TENANT_DATABASE_SERVER_URL}"
echo "Attempting to roll back migration: ${MIGRATION_NAME}"

# Define the SQL query to get the list of databases from the tenants table.
QUERY="select db_name from public.tenants;"

echo "Getting a list of databases to process..."
# Execute the query and store the results in a comma-separated string.
DB_LIST=$(psql ${DATABASE_URI} -t -A -R ',' -c "${QUERY}") 
echo "Databases found: ${DB_LIST}"

# Temporarily change the Internal Field Separator to a comma for looping.
IFS=","

# Get the path to the Prisma schema file.
SCHEMA_PATH=$(pwd)/prisma/tenant/schema/

# Loop through each database name in the list.
for DB_NAME in $DB_LIST; do
  # Construct the full database URI for the current tenant.
  DB="${TENANT_DATABASE_SERVER_URL}/${DB_NAME}"
  
  echo "Processing database: ${DB_NAME}"
  
  # Temporarily set the DATABASE_URI environment variable for the `prisma migrate` command.
  export DATABASE_URI=$DB
  
  echo "Rolling back migration '${MIGRATION_NAME}' for ${DB_NAME}..."
  
  # Run the Prisma command to mark the migration as rolled back.
  npx prisma migrate resolve --rolled-back "${MIGRATION_NAME}" --schema "${SCHEMA_PATH}"
  
  echo "Rollback successful for ${DB_NAME}."
done

# Reset IFS to its default value to prevent unexpected behavior.
unset IFS

echo "Migration rollback complete for all databases."