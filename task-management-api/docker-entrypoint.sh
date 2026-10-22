#!/bin/sh
set -e

# Run database migrations if DATABASE_URL is set
if [ -n "$DATABASE_URL" ]; then
  echo "Applying database migrations..."
  npx prisma migrate deploy || echo "Warning: Migration deploy encountered an issue, proceeding to application start..."
fi

exec "$@"
