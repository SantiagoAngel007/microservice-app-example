FROM golang:1.18 AS build

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod tidy

COPY . .

RUN go build -o auth-api

FROM gcr.io/distroless/base-debian11

WORKDIR /app

COPY --from=build /app/auth-api .

ENV AUTH_API_PORT=8000
ENV USERS_API_ADDRESS=http://users-api:8083
ENV JWT_SECRET=samuelangelsecret
ENV ZIPKIN_URL=http://zipkin:9411/api/v2/spans

EXPOSE 8000

ENTRYPOINT ["./auth-api"]