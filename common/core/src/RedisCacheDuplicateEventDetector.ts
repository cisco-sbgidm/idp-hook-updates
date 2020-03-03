import { DuplicateEventDetector } from './DuplicateEventDetector';
import { createClient } from 'redis';
import { promisify } from 'util';

/**
 * Implements DuplicateEventDetector using Redis cache
 */
export class RedisCacheDuplicateEventDetector implements DuplicateEventDetector {

  private readonly EXPIRE_SECONDS = 3600;
  private readonly getAsync: Function;
  private readonly setexAsync: Function;

  constructor() {
    if (!process.env.REDIS_CACHE_KEY) {
      throw new Error('REDIS_CACHE_KEY is not set');
    }
    if (!process.env.REDIS_CACHE_HOSTNAME) {
      throw new Error('REDIS_CACHE_HOSTNAME is not set');
    }
    if (!process.env.REDIS_CACHE_PORT) {
      throw new Error('REDIS_CACHE_PORT is not set');
    }
    const port = Number.parseInt(process.env.REDIS_CACHE_PORT, 10);
    if (!port) {
      throw new Error(`REDIS_CACHE_PORT is not a number ${process.env.REDIS_CACHE_PORT}`);
    }
    console.log('createClient');
    const client = createClient(
      port,
      process.env.REDIS_CACHE_HOSTNAME,
      {
        auth_pass: process.env.REDIS_CACHE_KEY,
        tls: { servername: process.env.REDIS_CACHE_HOSTNAME },
      });

    // use promisify until the client natively support promises
    this.getAsync = promisify(client.get).bind(client);
    this.setexAsync = promisify(client.setex).bind(client);
  }

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    console.log('isDuplicateEvent');
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

