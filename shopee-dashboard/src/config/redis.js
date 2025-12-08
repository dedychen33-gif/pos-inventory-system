const Redis = require('ioredis');

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

let redis = null;

const getRedisClient = () => {
  if (!redis) {
    redis = new Redis(redisConfig);
    
    redis.on('connect', () => {
      console.log('Redis connected successfully');
    });
    
    redis.on('error', (err) => {
      console.error('Redis connection error:', err);
    });
  }
  return redis;
};

// Cache helpers
const cache = {
  async get(key) {
    const client = getRedisClient();
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  },
  
  async set(key, value, ttl = 3600) {
    const client = getRedisClient();
    await client.set(key, JSON.stringify(value), 'EX', ttl);
  },
  
  async del(key) {
    const client = getRedisClient();
    await client.del(key);
  },
  
  async flush() {
    const client = getRedisClient();
    await client.flushdb();
  }
};

module.exports = { getRedisClient, cache };
