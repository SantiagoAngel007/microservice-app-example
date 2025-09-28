FROM maven:3.8.8-eclipse-temurin-8 AS build

WORKDIR /app
COPY . .
RUN mvn clean install -DskipTests

FROM openjdk:8-jre
WORKDIR /app
COPY --from=build /app/target/users-api-0.0.1-SNAPSHOT.jar app.jar
EXPOSE 8083
CMD ["java", "-jar", "app.jar"]
