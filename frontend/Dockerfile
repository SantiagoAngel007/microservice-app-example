# Etapa 1: Build
FROM node:18 AS build
WORKDIR /app

# Copiar y instalar dependencias
COPY package*.json ./
RUN npm install

# Copiar el resto del código
COPY . .

# Compilar la aplicación para producción
RUN npm run build

# Etapa 2: Servir con Nginx
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

# Elimina contenido por defecto de nginx
RUN rm -rf ./*

# Copia los archivos estáticos generados en la etapa de build
COPY --from=build /app/dist .    # ⚠️ si el build genera en "build" en lugar de "dist", cámbialo

# Copiar configuración personalizada de nginx (opcional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
