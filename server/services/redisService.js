const Redis = require("ioredis");

class RedisService {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.init();
  }

  init() {
    const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

    try {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          if (times > 3) {
            // Stop retrying aggressively if Redis is down
            return null;
          }
          return Math.min(times * 1000, 3000);
        },
        connectTimeout: 5000,
        enableOfflineQueue: false, // Don't hold up requests when offline
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        console.log("⚡ [Redis] Connected successfully to:", redisUrl);
      });

      this.client.on("ready", () => {
        this.isConnected = true;
      });

      this.client.on("error", (err) => {
        this.isConnected = false;
        // Suppress repetitive noisy logs
        if (err.code === "ECONNREFUSED") {
          // Redis is offline; application continues with in-memory / direct DB fallback
        } else {
          console.warn("⚠️ [Redis] Warning:", err.message);
        }
      });

      this.client.on("close", () => {
        this.isConnected = false;
      });
    } catch (e) {
      console.warn("⚠️ [Redis] Initialization failed, continuing without cache:", e.message);
      this.client = null;
      this.isConnected = false;
    }
  }

  /**
   * Get cached item by key
   * @param {string} key 
   * @returns {Promise<any|null>}
   */
  async get(key) {
    if (!this.client || !this.isConnected) return null;
    try {
      const data = await this.client.get(key);
      return data ? JSON.parse(data) : null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Set cached item with TTL
   * @param {string} key 
   * @param {any} value 
   * @param {number} ttlSeconds Default 3600 (1 hour)
   */
  async set(key, value, ttlSeconds = 3600) {
    if (!this.client || !this.isConnected) return false;
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

  /**
   * Delete cached key
   * @param {string} key 
   */
  async del(key) {
    if (!this.client || !this.isConnected) return false;
    try {
      await this.client.del(key);
      return true;
    } catch (err) {
      return false;
    }
  }

  /**
   * Delete keys by pattern (e.g., 'products:*')
   * @param {string} pattern 
   */
  async delPattern(pattern) {
    if (!this.client || !this.isConnected) return false;
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
}

module.exports = new RedisService();
