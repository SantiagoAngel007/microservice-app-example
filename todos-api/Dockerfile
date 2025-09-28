# Imagen base de Node.js
FROM node:18

# Directorio de trabajo en el contenedor
WORKDIR /app

# Copiar primero los archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm install

# Copiar el resto del código
COPY . .

# Exponer el puerto en el que corre el servicio
EXPOSE 8082

# Comando de inicio
CMD ["node", "server.js"]
