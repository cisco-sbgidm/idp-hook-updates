import { DuplicateEventDetector } from './DuplicateEventDetector';
import memoryCache, { CacheClass } from 'memory-cache';

/**
 * Implements DuplicateEventDetector using in memory cache
 */
export class CacheDuplicateEventDetector implements DuplicateEventDetector {
  readonly EXPIRATION_SECONDS = 6 * 60 * 60; // 6 hours;
  myCache = new memoryCache.Cache();

  /**
   * Returns true iff the event id is in cache
   * @param eventId
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    const cachedEventId = await this.myCache.get('eventId');
    return cachedEventId ? true : false;
  }

  /**
   * Add eventId to cache
   * @param eventId
   */
  async startProcessingEvent(eventId: string): Promise<any> {
    return await this.myCache.put('eventId', eventId, this.EXPIRATION_SECONDS * 1000);
  }

  /**
   * Do nothing in this implementation. We have no persistent storage to track events execution in
   * @param eventId
   */
  async stopProcessingEvent(eventId: string): Promise<any> {
    return Promise.resolve();
  }

  async clear(): Promise<any> {
    return this.myCache.clear();
  }
}
