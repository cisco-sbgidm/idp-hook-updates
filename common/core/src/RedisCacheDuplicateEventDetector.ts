import { DuplicateEventDetector } from './DuplicateEventDetector';
import { createClient } from 'redis';

/**
 * Implements DuplicateEventDetector using Redis cache
 */
export class RedisCacheDuplicateEventDetector implements DuplicateEventDetector {

  private readonly EXPIRE_SECONDS = 3600;

  constructor(isTls = true, isAuthRequired = true) {
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
    let tlsOptions = null;
    if (isTls) {
      tlsOptions = { servername: process.env.REDIS_CACHE_HOSTNAME };
    }
    let authPass = undefined;
    if (isAuthRequired) {
      if (!process.env.REDIS_CACHE_KEY) {
        throw new Error('REDIS_CACHE_KEY is not set');
      }
      authPass = process.env.REDIS_CACHE_KEY;
    }
    const client = createClient(
      {
        socket: {
          port,
          host: process.env.REDIS_CACHE_HOSTNAME,
          tls: isTls,
        },
        password: authPass,
      });
  }

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    return !!await this.get(eventId);
  }

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  async startProcessingEvent(eventId: string): Promise<any> {
    return this.setEx(eventId, this.EXPIRE_SECONDS, Date.now().toString());
  }

  /**
   * Marks an event processing as success.
   * @param eventId
   */
  async stopProcessingEvent(eventId: string): Promise<any> {
    // nothing to do
  }
}
