const Redis = require("ioredis");

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    // In-memory fallback cache for environments without a live Redis instance (e.g., Vercel serverless)
    this.memoryCache = new Map();
    this.init();
  }

  init() {
    const redisUrl = process.env.REDIS_URL;

    // If no REDIS_URL is provided, or if in production with a default localhost URL, use in-memory cache directly
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalhost = !redisUrl || redisUrl.includes("localhost") || redisUrl.includes("127.0.0.1");

    if (isProduction && isLocalhost) {
      console.log("ℹ️ [Cache] Production mode without remote REDIS_URL. Using fast in-memory cache fallback.");
      return;
    }

    const targetUrl = redisUrl || "redis://localhost:6379";

    try {
      this.client = new Redis(targetUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 2) {
            return null; // Stop retrying quickly to avoid delaying serverless functions
          }
          return 1000;
        },
        connectTimeout: 3000,
        enableOfflineQueue: false,
        lazyConnect: false,
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        console.log("⚡ [Redis] Connected successfully to Redis instance.");
      });

      this.client.on("ready", () => {
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        // Suppress noisy connection errors in logs; gracefully fallback to memoryCache
        if (err.code !== "ECONNREFUSED" && err.code !== "ENOTFOUND") {
          console.warn("⚠️ [Redis] Notice:", err.message);
        }
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });
    } catch (e) {
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Get cached item by key (checks Redis first, falls back to memoryCache)
   * @param {string} key 
   * @returns {Promise<any|null>}
   */
  async get(key) {
    // 1. Try Redis if connected
    if (this.client && this.isConnected) {
      try {
        const data = await this.client.get(key);
        if (data) return JSON.parse(data);
      } catch (err) {
        // Fallback to in-memory on error
      }
    }

    // 2. In-memory fallback with TTL check
    const item = this.memoryCache.get(key);
    if (!item) return null;

    if (item.expiry && Date.now() > item.expiry) {
      this.memoryCache.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set cached item with TTL (sets to Redis if available, also keeps in memoryCache)
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds Default 3600 (1 hour)
   */
  async set(key, value, ttlSeconds = 3600) {
    const expiry = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;

    // Always store in memory cache
    this.memoryCache.set(key, { value, expiry });

    // Also store in Redis if connected
    if (this.client && this.isConnected) {
      try {
        const serialized = JSON.stringify(value);
        if (ttlSeconds > 0) {
          await this.client.set(key, serialized, "EX", ttlSeconds);
        } else {
          await this.client.set(key, serialized);
        }
        return true;
      } catch (err) {
        return false;
      }
    }

    return true;
  }

  /**
   * Delete cached key
   * @param {string} key 
   */
  async del(key) {
    this.memoryCache.delete(key);

    if (this.client && this.isConnected) {
      try {
        await this.client.del(key);
        return true;
      } catch (err) {
        return false;
      }
    }

    return true;
  }

  /**
   * Delete keys by pattern (e.g., 'search:semantic:*')
   * @param {string} pattern 
   */
  async delPattern(pattern) {
    // 1. Memory cache pattern cleanup
    const regexPattern = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    for (const key of this.memoryCache.keys()) {
      if (regexPattern.test(key)) {
        this.memoryCache.delete(key);
      }
    }

    // 2. Redis pattern cleanup if connected
    if (this.client && this.isConnected) {
      try {
        const stream = this.client.scanStream({
          match: pattern,
          count: 50,
        });

        stream.on("data", async (keys = []) => {
          if (keys.length) {
            const pipeline = this.client.pipeline();
            keys.forEach((k) => pipeline.del(k));
            await pipeline.exec();
          }
        });
        return true;
      } catch (err) {
        return false;
      }
    }

    return true;
  }
}

module.exports = new RedisService();
