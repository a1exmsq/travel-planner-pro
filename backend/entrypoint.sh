#!/bin/sh
set -e
export DB_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
export SERVER_PORT="${PORT:-8080}"
exec java -jar /app/app.jar
