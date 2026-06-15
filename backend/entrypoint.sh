#!/bin/sh
export DB_URL="jdbc:postgresql://${DB_HOST}:${DB_PORT:-5432}/${DB_NAME}"
exec java -jar /app/app.jar
