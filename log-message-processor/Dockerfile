# Imagen base con Python
FROM python:3.9-slim

# Directorio de trabajo
WORKDIR /app

# Copiar los archivos
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Variables de entorno por defecto
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379
ENV REDIS_CHANNEL=logs
ENV ZIPKIN_URL=""

# Comando de inicio
CMD ["python", "main.py"]
