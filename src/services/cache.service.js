import { config } from "#config/config";
import { TTL } from "#constants/ttl.constant";
import redis from "redis";

export class CacheService {
  static instance = null;

  /** @returns {CacheService} */
  static getInstance() {
    if (!this.instance) {
      this.instance = new CacheService();
    }
    return this.instance;
  }

  /** 
   * @private 
   * @info - Please always use .getInstance() to get the instance of the CacheService.
   * */
  constructor() {
    this.redis = redis.createClient({
      url: config.redis.uri,
    });
  }

  connectToRedis = async () => {
    await this.redis.connect();
  }

  /** @returns {redis.RedisClient} */
  static getRedisClient = () => {
    const redis = CacheService.getInstance();
    return redis.redis;
  }

  set = async (key, value, ttl = TTL.IN_30_MINUTES ) => {
    console.log(`value: ${JSON.stringify(value, null, 2)}`);
    await this.redis.set(key, JSON.stringify(value), { EX: ttl });
  }

  get = async (key) => {
    const value = await this.redis.get(key);
    return value ? JSON.parse(value) : null;
  }

  delete = async (key) => {
    await this.redis.del(key);
  }

  deleteMany = async (keys) => {
    keys = Array.isArray(keys) ? keys : [keys];
    if (keys.length === 0) return;
    await this.redis.del(keys);
  }

  disconnect = async () => {
    await this.redis.disconnect();
  }

  flush = async () => {
    await this.redis.flushAll();
  }
}