#!/bin/sh
# payment-service entrypoint
# Uses DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD (not DATABASE_URL)
set -e

SERVICE="payment-service"
MAX_RETRIES=30
RETRY_INTERVAL=3

echo "[$SERVICE] Waiting for PostgreSQL and running migrations..."

attempt=0
while [ $attempt -lt $MAX_RETRIES ]; do
  if npm run migration:run 2>&1; then
    echo "[$SERVICE] Migrations applied (or already up to date)."
    break
  fi
  attempt=$((attempt + 1))
  if [ $attempt -eq $MAX_RETRIES ]; then
    echo "[$SERVICE] ERROR: Could not apply migrations after $MAX_RETRIES attempts. Exiting."
    exit 1
  fi
  echo "[$SERVICE] Migration attempt $attempt/$MAX_RETRIES failed — retrying in ${RETRY_INTERVAL}s..."
  sleep $RETRY_INTERVAL
done

echo "[$SERVICE] Starting application on port ${PORT:-3004}..."
exec node dist/main.js
