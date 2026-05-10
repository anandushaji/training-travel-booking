#!/bin/sh
# api-gateway entrypoint
# No database migrations — just start the app.
set -e

echo "[api-gateway] Starting application on port ${PORT:-4000}..."
exec node dist/main.js
