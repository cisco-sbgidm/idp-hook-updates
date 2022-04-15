import { DuplicateEventDetector } from './DuplicateEventDetector';
import { createClient } from 'redis';

/**
 * Implements DuplicateEventDetector using Redis cache
 */
export class RedisCacheDuplicateEventDetector implements DuplicateEventDetector {

  private readonly EXPIRE_SECONDS = 3600;
  private readonly redisHost = process.env.REDIS_CACHE_HOSTNAME;
  private readonly redisPort = process.env.REDIS_CACHE_PORT;
  private readonly redisPassword = process.env.REDIS_CACHE_KEY;
  private readonly getAsync: Function;
  private readonly setexAsync: Function;

  constructor(isAuthRequired: boolean = true) {
    if (!this.redisHost) {
      throw new Error('REDIS_CACHE_HOSTNAME is not set');
    }
    if (!this.redisPort) {
      throw new Error('REDIS_CACHE_PORT is not set');
    }
    const port = Number.parseInt(this.redisPort, 10);
    if (!port) {
      throw new Error(`REDIS_CACHE_PORT is not a number ${this.redisPort}`);
    }

    if (isAuthRequired && !this.redisPassword) {
      throw new Error('REDIS_CACHE_KEY is not set');
    }

    const client = createClient({
      url: `rediss://${this.redisHost}:${port}`,
      ...(this.redisPassword ? { password: this.redisPassword } : null),
    });

    this.getAsync = client.get;
    this.setexAsync = client.setEx;
  }

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    return !!await this.getAsync(eventId);
  }

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  async startProcessingEvent(eventId: string): Promise<any> {
    return this.setexAsync(eventId, this.EXPIRE_SECONDS, Date.now().toString());
  }

  /**
   * Marks an event processing as success.
   * @param eventId
   */
  async stopProcessingEvent(eventId: string): Promise<any> {
    // nothing to do
  }
}
