FROM openjdk:8-jre-alpine

# Instalar curl para health checks
RUN apk add --no-cache curl

WORKDIR /app

# Copiar JAR construido
COPY target/users-api-*.jar app.jar

EXPOSE 8083

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=60s \
  CMD curl -f http://localhost:8083/users/ || exit 1

ENTRYPOINT ["java", "-jar", "app.jar"]