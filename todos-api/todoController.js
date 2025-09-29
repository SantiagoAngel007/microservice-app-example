'use strict';
const cache = require('memory-cache');
const CacheService = require('./cacheService');
const { Annotation,
    jsonEncoder: { JSON_V2 } } = require('zipkin');
const OPERATION_CREATE = 'CREATE',
    OPERATION_DELETE = 'DELETE';
class TodoController {
    constructor({ tracer, redisClient, logChannel }) {
        this._tracer = tracer;
        this._redisClient = redisClient;
        this._logChannel = logChannel;
        this._cacheService = new CacheService(redisClient);
    }
    // Cache-Aside Pattern: Read-through cache
    async list(req, res) {
        const username = req.user.username;
        const cacheKey =
            this._cacheService.generateUserTodosKey(username);
        try {
            // 1. Try to get from cache first (Cache-Aside)
            let cachedTodos = await
                this._cacheService.get(cacheKey);
            if (cachedTodos) {
                return res.json(cachedTodos);
            }
            // 2. Cache miss - get from primary data store
            const data = this._getTodoData(username);
            const todosArray = Object.values(data.items);
            // 3. Write to cache for future requests
            await this._cacheService.set(cacheKey,
                todosArray, 600);
            res.json(todosArray);
        } catch (error) {
            console.error('Error in list todos:', error);
            // Fallback to direct data access if cache fails
            const data = this._getTodoData(username);
            res.json(Object.values(data.items));
        }
    }
    // Cache-Aside Pattern: Write-through cache
    async create(req, res) {
        const username = req.user.username;
        const data = this._getTodoData(username);
        const todo = {
            content: req.body.content,
            id: data.lastInsertedID
        };
        data.items[data.lastInsertedID] = todo;
        data.lastInsertedID++;
        this._setTodoData(username, data);
        try {
            // Cache-Aside: Invalidate cache on write
            const userCacheKey =
                this._cacheService.generateUserTodosKey(username);
            await this._cacheService.delete(userCacheKey);
            // Cache individual todo item
            const todoCacheKey =
                this._cacheService.generateTodoKey(todo.id);
            await this._cacheService.set(todoCacheKey, todo);
            this._logOperation(OPERATION_CREATE, username,
                todo.id);
            res.json(todo);
        } catch (error) {
            console.error('Error in create todo:', error);
            // Continue with response even if cache operation
            fails
            this._logOperation(OPERATION_CREATE, username,
                todo.id);
            res.json(todo);
        }
    }
    // Cache-Aside Pattern: Write-through cache with invalidation
    async delete(req, res) {
        const username = req.user.username;
        const id = req.params.taskId;
        const data = this._getTodoData(username);
        delete data.items[id];
        this._setTodoData(username, data);
        try {
            // Cache-Aside: Invalidate cache on write
            const userCacheKey =
                this._cacheService.generateUserTodosKey(username);
            const todoCacheKey =
                this._cacheService.generateTodoKey(id);
            await Promise.all([
                this._cacheService.delete(userCacheKey),
                this._cacheService.delete(todoCacheKey)
            ]);
            this._logOperation(OPERATION_DELETE, username,
                id);
            res.status(204).send();
        } catch (error) {
            console.error('Error in delete todo:', error);
            // Continue with response even if cache operation
            fails
            this._logOperation(OPERATION_DELETE, username,
                id);
            res.status(204).send();
        }
    }
    _logOperation(opName, username, todoId) {
        this._tracer.scoped(() => {
            const traceId = this._tracer.id;
            this._redisClient.publish(this._logChannel,
                JSON.stringify({
                    zipkinSpan: traceId,
                    opName: opName,
                    username: username,
                    todoId: todoId,
                }));
        });
    }
    _getTodoData(userID) {
        var data = cache.get(userID);
        if (data == null) {
            data = {
                items: {
                    '1': {id: 1, content: "Create new todo"},
                    '2': { id: 2, content: "Update me" },
                    '3': {id: 3, content: "Delete example ones" }
                    },
                    lastInsertedID: 4
                };
                this._setTodoData(userID, data);
            }
            return data;
        }
        _setTodoData(userID, data) {
            cache.put(userID, data);
        }
    }
module.exports = TodoController;