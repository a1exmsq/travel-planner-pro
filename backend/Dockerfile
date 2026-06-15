# Multi-stage build for Spring Boot backend
# NOTE: Render uses the repo root as build context even though this Dockerfile lives in ./backend.
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /app/backend
COPY backend/. .
RUN chmod +x mvnw
RUN ./mvnw clean package -DskipTests

FROM eclipse-temurin:21-jre-alpine
WORKDIR /app
COPY --from=build /app/backend/target/*.jar app.jar
COPY backend/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh
EXPOSE 8080
ENTRYPOINT ["sh", "/app/entrypoint.sh"]
