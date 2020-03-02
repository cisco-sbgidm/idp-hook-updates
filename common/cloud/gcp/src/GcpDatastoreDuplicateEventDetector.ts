import { DuplicateEventDetector } from '@core/DuplicateEventDetector';
import { Datastore } from '@google-cloud/datastore';
import { Entity } from '@google-cloud/datastore/build/src/entity';
import * as _ from 'lodash';

/**
 * Implements DuplicateEventDetector using GCP Datastore.
 */
export class GcpDatastoreDuplicateEventDetector implements DuplicateEventDetector {

  readonly TABLE_NAME: string;
  readonly EXPIRATION_SECONDS = 6 * 60 * 60; // 6 hours;
  readonly datastore = new Datastore();

  constructor() {
    if (!process.env.EVENTS_TABLE_NAME) {
      throw new Error('EVENTS_TABLE_NAME is not set');
    }
    this.TABLE_NAME = process.env.EVENTS_TABLE_NAME;
  }

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    // Prepares the new entity
    const key = this.datastore.key([this.TABLE_NAME, eventId]);
    const [result] = await this.datastore.get(key);
    return !!result;
  }

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  async startProcessingEvent(eventId: string): Promise<any> {
    // Prepares the new entity
    const event = {
      key: this.datastore.key([this.TABLE_NAME, eventId]),
      data: {
        started: Date.now().toString(),
      },
    };
    // Saves the entity
    return await this.datastore.save(event);
  }

  /**
   * Marks an event processing as success.
   * @param eventId
   */
  async stopProcessingEvent(eventId: string): Promise<any> {
    // Prepares the new entity
    const event = {
      key: this.datastore.key([this.TABLE_NAME, eventId]),
      data: {
        stopped: Date.now().toString(),
      },
    };
    // Saves the entity
    return await this.datastore.save(event);
  }
  // There is no automatic expiration of documents in GCP Datastore, therefore we need to delete outdated records
  // explicitly at the end of the processing so that they won't pile up
  async deleteExpiredEvents() {
    const threshold = new Date();
    threshold.setSeconds(threshold.getSeconds() - this.EXPIRATION_SECONDS);
    const query = this.datastore
        .createQuery(this.TABLE_NAME)
        .filter('started', '<', threshold);
    const events: Entity[] = await this.datastore.runQuery(query);
    return await Promise.all(_.map(events, event => this.datastore.delete(event.key)));
  }
}
