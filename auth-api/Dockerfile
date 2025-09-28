# Etapa de compilación con Go 1.13 (últimas versiones que soportan dep)
FROM golang:1.13 AS build

# Definir GOPATH
ENV GOPATH=/go
WORKDIR /go/src/auth-api

# Copiar el código al GOPATH
COPY . .

# Instalar dep
RUN go get -u github.com/golang/dep/cmd/dep

# Descargar dependencias
RUN dep ensure -vendor-only

# Compilar el binario
RUN go build -o /auth-api

# Imagen final
FROM debian:buster-slim
WORKDIR /app
COPY --from=build /auth-api .
EXPOSE 8081

# Variables de entorno por defecto
ENV AUTH_API_PORT=8081
ENV JWT_SECRET=foo

CMD ["./auth-api"]
