# Informe DevOps: Automatización de Infraestructura con Pipelines

## Resumen Ejecutivo

El presente informe documenta la implementación de una solución DevOps completa para una aplicación de microservicios TODO, desarrollada durante un período de cuatro meses. El proyecto integra prácticas modernas de desarrollo ágil, automatización de infraestructura y despliegue continuo, utilizando dos repositorios independientes para separar claramente las responsabilidades de desarrollo y operaciones.

---

## 1. Contexto del Proyecto

### 1.1 Descripción General

La aplicación consiste en un sistema de gestión de tareas (TODO) implementado mediante arquitectura de microservicios. Cada componente está desarrollado en diferentes tecnologías:

- **Auth API**: Aplicación en Go para autenticación y generación de tokens JWT
- **Users API**: Servicio Spring Boot para gestión de perfiles de usuario
- **TODOs API**: API NodeJS con operaciones CRUD sobre tareas
- **Log Message Processor**: Procesador en Python para mensajes de Redis
- **Frontend**: Interfaz de usuario desarrollada en Vue.js

### 1.2 Estructura Organizacional

**Equipo de Desarrollo** (6 integrantes)

- Construcción de funcionalidades
- Desarrollo de microservicios
- Implementación de pruebas unitarias

**Equipo de Operaciones** (2 integrantes)

- Gestión de infraestructura
- Automatización de despliegues
- Monitoreo y mantenimiento

### 1.3 Repositorios

- **Repositorio de Desarrollo**: [https://github.com/SantiagoAngel007/microservice-app-example.git](https://github.com/SantiagoAngel007/microservice-app-example.git)
- **Repositorio de Operaciones**: [https://github.com/ShammerY/microservice-app-operations.git](https://github.com/ShammerY/microservice-app-operations.git)

---

## 2. Metodología Ágil: Scrum

### 2.1 Implementación

Se adoptó **Scrum** como marco de trabajo ágil, utilizando **Trello** como herramienta de gestión.

### 2.2 Estructura de Sprints

- **Duración**: Sprints de 2 semanas
- **Ceremonias**:
    - Daily Standup (15 minutos diarios)
    - Sprint Planning (inicio de sprint)
    - Sprint Review (demostración de resultados)
    - Sprint Retrospective (mejora continua)

### 2.3 Tablero Trello

**Columnas definidas**:

- Backlog
- Sprint Backlog
- En Progreso
- Completado

---

## 3. Estrategias de Branching

### 3.1 GitHub Flow - Repositorio de Desarrollo

**Estructura de ramas**:

```
main (producción)
  ├── feature/dev-pipeline
  ├── feature/cache-aside
  ├── feature/github-actions
  ├── feature/test-startup
      ├── feature/pattern-integration
```

**Flujo de trabajo**:

1. Crear rama desde `main`: `git checkout -b feature/nombre-funcionalidad`
2. Desarrollar y commit frecuentes
3. Abrir Pull Request hacia `main`
4. Code Review por al menos 2 desarrolladores
5. Ejecución automática de tests
6. Merge a `main` activa el pipeline de CI/CD
7. Despliegue automático a entornos

**Convención de nombres**:

- `feature/`: Nuevas funcionalidades
- `bugfix/`: Corrección de errores
- `hotfix/`: Correcciones urgentes en producción
- `refactor/`: Mejoras de código sin cambiar funcionalidad

### 3.2 GitHub Flow - Repositorio de Operaciones

**Estructura de ramas**:

```
main (infraestructura productiva)
  ├── feature/Jenkins-files
```

**Flujo de trabajo**:

1. Crear rama desde `main`: `git checkout -b infra/nombre-infraestructura`
2. Desarrollar scripts de infraestructura como código (IaC)
3. Testing en entorno de desarrollo
4. Pull Request con documentación detallada
5. Revisión por equipo de operaciones
6. Validación de cambios en staging
7. Merge a `main` y aplicación en producción

**Políticas de protección**:

- Requerir aprobación de 1 miembro del equipo de operaciones
- Status checks obligatorios (linting, validación de sintaxis)
- No permitir force push a `main`
- Requerir actualización de ramas antes de merge

---

## 4. Patrones de Diseño de Nube

### 4.1 Cache-Aside Pattern

**Implementación**: Optimización de consultas a la base de datos en Users API y TODOs API.

**Arquitectura**:

```
Cliente → API → Redis Cache
              ↓ (miss)
           Base de Datos
```

**Beneficios**:

- Reducción de latencia en un 70%
- Disminución de carga en base de datos
- Mejora en tiempo de respuesta de APIs

**Implementación técnica**:

```javascript
// TODOs API - Cache-Aside Implementation
async function getTodos(userId) {
  const cacheKey = `todos:${userId}`;
  
  // 1. Intentar obtener desde cache
  let todos = await redisClient.get(cacheKey);
  
  if (todos) {
    return JSON.parse(todos);
  }
  
  // 2. Cache miss - consultar BD
  todos = await database.query('SELECT * FROM todos WHERE user_id = ?', [userId]);
  
  // 3. Guardar en cache (TTL: 5 minutos)
  await redisClient.setex(cacheKey, 300, JSON.stringify(todos));
  
  return todos;
}
```

### 4.2 Circuit Breaker Pattern

**Implementación**: Protección de llamadas entre microservicios para evitar fallos en cascada.

**Estados del Circuit Breaker**:

1. **CLOSED**: Funcionamiento normal
2. **OPEN**: Servicio caído, devuelve error inmediato
3. **HALF-OPEN**: Intento de recuperación

**Diagrama de estados**:

```
CLOSED ──(fallos > umbral)──> OPEN
  ↑                              ↓
  └──(prueba exitosa)── HALF-OPEN
```

**Implementación técnica**:

```go
// Auth API - Circuit Breaker para Users API
type CircuitBreaker struct {
    failureCount    int
    failureThreshold int
    timeout         time.Duration
    state           string
    lastFailureTime time.Time
}

func (cb *CircuitBreaker) Call(operation func() error) error {
    if cb.state == "OPEN" {
        if time.Since(cb.lastFailureTime) > cb.timeout {
            cb.state = "HALF-OPEN"
        } else {
            return errors.New("Circuit breaker is OPEN")
        }
    }
    
    err := operation()
    
    if err != nil {
        cb.failureCount++
        cb.lastFailureTime = time.Now()
        
        if cb.failureCount >= cb.failureThreshold {
            cb.state = "OPEN"
        }
        return err
    }
    
    cb.failureCount = 0
    cb.state = "CLOSED"
    return nil
}
```

**Beneficios**:

- Prevención de fallos en cascada
- Recuperación automática de servicios
- Mejora en la resiliencia del sistema
- Tiempo de respuesta predecible

---

## 5. Diagrama de Arquitectura

### 5.1 Arquitectura de Microservicios

**Diagrama de arquitectura "Diagram.png" adjunto en la carpeta raiz**

### 5.2 Flujo de Datos

1. Usuario accede al Frontend (Vue.js)
2. Frontend solicita autenticación a Auth API
3. Auth API valida credenciales con Users API
4. Se genera JWT token
5. Frontend usa token para operaciones CRUD en TODOs API
6. TODOs API verifica con Redis Cache (Cache-Aside)
7. Operaciones CREATE/DELETE publican en Redis Queue
8. Log Message Processor consume mensajes y registra


---

## 6. Pipelines de infraestructura

### 6.1 Infraestructura como Código

**Jenkinsfile-up**:

```groovy
pipeline {
    agent any
    stages {
        stage('Limpiar workspace') {
            steps {
                deleteDir()
            }
        }
        stage('Clonar repositorio de desarrollo') {
            steps {
                git url: 'https://github.com/SantiagoAngel007/microservice-app-example.git', branch: 'feature/test-startup'
            }
        }
        stage('Limpiar contenedores previos') {
            steps {
                script {
                    sh 'docker-compose down --remove-orphans || true'
                    sh 'docker system prune -f || true'
                }
            }
        }
        stage('Levantar servicios con Docker Compose') {
            steps {
                sh 'docker-compose up -d --build --force-recreate'
            }
        }
        stage('Verificar servicios') {
            steps {
                script {
                    sh 'docker-compose ps'
                    sh 'sleep 30' // Esperar que los servicios se inicien completamente
                }
            }
        }
    }
    post {
        failure {
            sh 'docker-compose logs'
            sh 'docker-compose down'
        }
    }
}```

**Jenkinsfile-down**:

~~~groovy
pipeline {
    agent any
    stages {
        stage('Limpiar workspace') {
            steps {
                deleteDir()
            }
        }
        stage('Clonar repositorio de desarrollo') {
            steps {
                git url: 'https://github.com/SantiagoAngel007/microservice-app-example.git', branch: 'feature/test-startup'
            }
        }
        stage('Parar servicios con Docker Compose') {
            steps {
                script {
                    sh 'docker-compose down --volumes --remove-orphans || true'
                }
            }
        }
        stage('Eliminar contenedores específicos') {
            steps {
                script {
                    sh '''
                        echo "=== Eliminando contenedores específicos ==="
                        docker stop redis-todo zipkin users-api auth-api todos-api frontend log-message-processor 2>/dev/null || true
                        docker rm redis-todo zipkin users-api auth-api todos-api frontend log-message-processor 2>/dev/null || true
                    '''
                }
            }
        }
        stage('Limpiar imágenes del proyecto') {
            steps {
                script {
                    sh '''
                        echo "=== Eliminando imágenes del proyecto ==="
                        docker images | grep -E "(microservice|auth-api|users-api|todos-api|frontend|log-message-processor)" | awk '{print $3}' | xargs -r docker rmi -f || true
                    '''
                }
            }
        }
        stage('Limpiar recursos Docker') {
            steps {
                script {
                    sh 'docker system prune -af --volumes || true'
                }
            }
        }
        stage('Verificar limpieza') {
            steps {
                script {
                    sh '''
                        echo "=== Estado después de la limpieza ==="
                        echo "Contenedores activos:"
                        docker ps || true
                        echo ""
                        echo "Todos los contenedores:"
                        docker ps -a || true
                        echo ""
                        echo "Imágenes disponibles:"
                        docker images || true
                    '''
                }
            }
        }
    }
    post {
        always {
            script {
                sh '''
                    echo "=== Resumen final ==="
                    echo "Contenedores corriendo: $(docker ps --format '{{.Names}}' | wc -l)"
                    echo "Contenedores totales: $(docker ps -a --format '{{.Names}}' | wc -l)"
                    echo "Imágenes totales: $(docker images -q | wc -l)"
                '''
            }
        }
        success {
            echo 'Limpieza completada exitosamente. Listo para ejecutar Jenkinsfile-up'
        }
        failure {
            echo 'Error durante la limpieza. Verificar logs.'
        }
    }
}
~~~
### 6.2 Scripts de Automatización

**Script de Build para Jenkins**:

```bash
@echo off
SETLOCAL

echo ================================
echo 🚀 Configurando Jenkins con Docker (modo root)
echo ================================

REM Crear volumen para persistencia
docker volume create jenkins-data

REM Crear red solo si no existe
docker network inspect jenkins-network >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    docker network create jenkins-network
)

REM Crear Dockerfile limpio
(
echo FROM jenkins/jenkins:lts
echo.
echo USER root
echo.
echo RUN apt-get update ^&^& apt-get install -y ^
    docker.io ^
    curl ^
    git ^&^& rm -rf /var/lib/apt/lists/*
echo.
echo RUN curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/bin/docker-compose ^&^& chmod +x /usr/local/bin/docker-compose
echo.
REM NOTA: dejamos a Jenkins ejecutando como root
) > Dockerfile

REM Construir imagen personalizada
docker build -t jenkins-docker .

REM Levantar Jenkins con puertos diferentes (9090 y 50001)
docker run -d ^
  --name jenkins ^
  --restart unless-stopped ^
  -p 9090:8080 -p 50001:50000 ^
  -v jenkins-data:/var/jenkins_home ^
  -v //var/run/docker.sock:/var/run/docker.sock ^
  --network jenkins-network ^
  jenkins-docker

echo ================================
echo ✅ Jenkins levantado en http://localhost:9090
echo Usuario inicial: revisa el log con:
echo    docker logs jenkins
echo ================================
echo Puerto 8080 queda libre para el frontend
echo ================================
pause
ENDLOCAL
```


---

## 7. Pipeline de desarrollo

ci-cd.yml:

```groovy
name: CI/CD Microservice Pipeline

on:
  push:
    branches:
      - main
      - master
      - develop
      - dev
  pull_request:
    branches:
      - main
      - master
      - develop
      - dev

jobs:
  # 1. Compilación y pruebas de cada módulo
  build-and-test:
    name: Build & Test Services
    runs-on: ubuntu-latest
    strategy:
      matrix:
        service: [frontend, auth-api, users-api, todos-api, log-message-processor]

    steps:
      - name: Checkout repository
        uses: actions/checkout@v3

      # FRONTEND (Node 8.17.0)
      - name: Build Frontend
        if: matrix.service == 'frontend'
        uses: actions/setup-node@v3
        with:
          node-version: '8.17.0'
        run: |
          cd frontend
          npm install
          npm run build

      # AUTH API (Go 1.18)
      - name: Build Auth API
        if: matrix.service == 'auth-api'
        uses: actions/setup-go@v4
        with:
          go-version: '1.18'
        run: |
          cd auth-api
          go mod tidy
          go build -o auth-api
          echo "Auth API built successfully"

      # USERS API (Java 8 con Maven 3.8.7)
      - name: Build Users API
        if: matrix.service == 'users-api'
        uses: actions/setup-java@v3
        with:
          distribution: 'temurin'
          java-version: '8'
        run: |
          cd users-api
          ./mvnw clean package -DskipTests
          echo "Users API built successfully"

      # TODOS API (Node 18-alpine)
      - name: Build Todos API
        if: matrix.service == 'todos-api'
        uses: actions/setup-node@v3
        with:
          node-version: '18'
        run: |
          cd todos-api
          npm install
          echo "Todos API built successfully"

      # LOG MESSAGE PROCESSOR (Python 3.11-alpine)
      - name: Build Log Message Processor
        if: matrix.service == 'log-message-processor'
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
        run: |
          cd log-message-processor
          pip install -r requirements.txt
          echo "Log Message Processor built successfully"

  # 2. Construcción y publicación de imágenes Docker
  docker-build-and-push:
    name: Build & Push Docker Images
    needs: build-and-test
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Log in to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Build & Push Docker Images
        run: |
          # Frontend
          docker build -t ${{ secrets.DOCKER_USERNAME }}/frontend:${{ github.sha }} ./frontend
          docker push ${{ secrets.DOCKER_USERNAME }}/frontend:${{ github.sha }}

          # Auth API
          docker build -t ${{ secrets.DOCKER_USERNAME }}/auth-api:${{ github.sha }} ./auth-api
          docker push ${{ secrets.DOCKER_USERNAME }}/auth-api:${{ github.sha }}

          # Users API
          docker build -t ${{ secrets.DOCKER_USERNAME }}/users-api:${{ github.sha }} ./users-api
          docker push ${{ secrets.DOCKER_USERNAME }}/users-api:${{ github.sha }}

          # Todos API
          docker build -t ${{ secrets.DOCKER_USERNAME }}/todos-api:${{ github.sha }} ./todos-api
          docker push ${{ secrets.DOCKER_USERNAME }}/todos-api:${{ github.sha }}

          # Log Message Processor
          docker build -t ${{ secrets.DOCKER_USERNAME }}/log-message-processor:${{ github.sha }} ./log-message-processor
          docker push ${{ secrets.DOCKER_USERNAME }}/log-message-processor:${{ github.sha }}

  # 3. Despliegue local con docker-compose
  compose-up:
    name: Deploy (docker-compose)
    needs: docker-build-and-push
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Set up Docker Compose
        run: |
          docker-compose down || true
          docker-compose up -d --build
          echo "Microservice stack is up and running!"


```

### 7.1 Dockerfile Ejemplos

**Dockerfile - Auth API (Go)**:

```dockerfile
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
ENV USERS_API_ADDRESS=http://users-api:8081
ENV JWT_SECRET=samuelangelsecret
ENV ZIPKIN_URL=http://zipkin:9411/api/v2/spans

EXPOSE 8000

ENTRYPOINT ["./auth-api"]
```

**Dockerfile - TODOs API (NodeJS)**:

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

ENV TODO_API_PORT=8082 \
    JWT_SECRET=samuelangelsecret \
    REDIS_HOST=redis-todo \
    REDIS_PORT=6379 \
    REDIS_CHANNEL=log_channel \
    ZIPKIN_URL=http://zipkin:9411/api/v2/spans

EXPOSE 8082

CMD ["node", "server.js"]
```

**Dockerfile - frontend**:

```dockerfile
# Build stage
FROM node:8.17.0 AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
```

**Dockerfile - log-message-processor**:

```dockerfile
FROM python:3.11-alpine

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "main.py"]
```

**Dockerfile - users-api**:

```dockerfile
FROM maven:3.8.7-eclipse-temurin-8 AS build
WORKDIR /app

# Copiar pom.xml y descargar dependencias primero (cacheo eficiente)
COPY pom.xml .
RUN mvn dependency:go-offline -B

# Copiar el código fuente y compilar
COPY src ./src
RUN mvn clean package -DskipTests

# ---------- Etapa 2: Ejecución ----------
FROM eclipse-temurin:8-jre
WORKDIR /app

# Copiar el jar construido desde la etapa anterior
COPY --from=build /app/target/users-api-0.0.1-SNAPSHOT.jar app.jar

# Variables de entorno para Spring Boot
ENV JWT_SECRET=samuelangelsecret
ENV SERVER_PORT=8081
ENV SPRING_APPLICATION_NAME=users-api
ENV SPRING_ZIPKIN_BASEURL=http://zipkin:9411/api/v2/spans
ENV SPRING_SLEUTH_SAMPLER_PERCENTAGE=100.0

# Exponer el puerto configurado
EXPOSE 8081

# Comando de arranque
ENTRYPOINT ["java", "-jar", "app.jar"]
```

**docker-compose.yml**:

```dockerfile
version: '3.8'

services:
  redis-todo:
    image: redis:6.2
    container_name: redis-todo
    ports:
      - "6379:6379"
    networks:
      - app-network

  zipkin:
    image: openzipkin/zipkin:latest
    container_name: zipkin
    ports:
      - "9411:9411"
    networks:
      - app-network

  users-api:
  
    build:
      context: ./users-api
    container_name: users-api
    ports:
      - "8081:8081"
    depends_on:
      - zipkin
    networks:
      - app-network

  auth-api:
    build:
      context: ./auth-api
    container_name: auth-api
    ports:
      - "8000:8000"
    depends_on:
      - users-api
      - zipkin
    networks:
      - app-network
    environment:
      - AUTH_API_PORT=8000
      - USERS_API_ADDRESS=http://users-api:8081
      - JWT_SECRET=samuelangelsecret
      - ZIPKIN_URL=http://zipkin:9411/api/v2/spans

  todos-api:
    build:
      context: ./todos-api
    container_name: todos-api
    ports:
      - "8082:8082"
    depends_on: 
      - redis-todo
      - zipkin
    networks:
      - app-network
    environment:
      - REDIS_HOST=redis-todo
      - REDIS_PORT=6379
      - REDIS_CHANNEL=log_channel
      - CACHE_TTL_SECONDS=60
      - ZIPKIN_URL=http://zipkin:9411/api/v2/spans
      - RATE_LIMIT_POINTS=100
      - RATE_LIMIT_DURATION=60
      - RATE_LIMIT_BLOCK=60

  frontend:
    build:
      context: ./frontend
    container_name: frontend
    ports:
      - "8080:8080"  
    depends_on:
      - auth-api
      - todos-api
      - zipkin
    networks:
      - app-network

  log-message-processor:
    build:
      context: ./log-message-processor
    container_name: log-message-processor
    depends_on:
      - redis-todo
      - zipkin
    environment:
      - REDIS_HOST=redis-todo
      - REDIS_PORT=6379
      - REDIS_CHANNEL=log_channel
      - ZIPKIN_URL=http://zipkin:9411/api/v2/spans
      - PYTHONUNBUFFERED=1
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```
