'use strict';
const redis = require('redis');
class CacheService {
    constructor(redisClient) {
        this.client = redisClient;
        this.defaultTTL = 300; // 5 minutos
    }
    // Cache-Aside Pattern Implementation
    async get(key) {
        try {
            const cachedData = await this.client.get(key);
            if (cachedData) {
                console.log(`Cache HIT for key: ${key}`);
                return JSON.parse(cachedData);
            }
            console.log(`Cache MISS for key: ${key}`);
            return null;
        } catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    async set(key, data, ttl = this.defaultTTL) {
        try {
            await this.client.setex(key, ttl,
                JSON.stringify(data));
            console.log(`Cache SET for key: ${key}`);
        } catch (error) {
            console.error('Cache set error:', error);
        }
    }
    async delete(key) {
        try {
            await this.client.del(key);
            console.log(`Cache DELETE for key: ${key}`);
        } catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    async deletePattern(pattern) {
        try {
            const keys = await this.client.keys(pattern);
            if (keys.length > 0) {
                await this.client.del(keys);
                console.log(`Cache DELETE pattern ${pattern}:
${keys.length} keys removed`);
            }
        } catch (error) {
            console.error('Cache delete pattern error:',
                error);
        }
    }
    generateUserTodosKey(username) {
        return `todos:user:${username}`;
    }
    generateTodoKey(todoId) {
        return `todo:${todoId}`;
    }
}
module.exports = CacheService;