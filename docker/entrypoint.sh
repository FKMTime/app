#!/bin/sh
set -e

echo "[entrypoint] applying database migrations..."
prisma migrate deploy

echo "[entrypoint] starting app..."
exec "$@"
