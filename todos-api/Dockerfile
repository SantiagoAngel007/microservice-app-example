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