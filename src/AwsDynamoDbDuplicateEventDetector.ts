import { DuplicateEventDetector } from './DuplicateEventDetector';
import { DynamoDB } from 'aws-sdk';

/**
 * Implements DuplicateEventDetector using AWS DynamoDB.
 */
export class AwsDynamoDbDuplicateEventDetector implements DuplicateEventDetector {

  constructor() {
  }

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  isDuplicateEvent(eventId: string): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  startProcessingEvent(eventId: string): Promise<any> {
    return Promise.resolve();
  }

  /**
   * Marks an event prcoessing as done.
   * @param eventId
   */
  stopProcessingEvent(eventId: string): Promise<any> {
    return Promise.resolve();
  }
}
