import { DuplicateEventDetector } from './DuplicateEventDetector';
import { DynamoDB } from 'aws-sdk';

/**
 * Implements DuplicateEventDetector using AWS DynamoDB.
 */
export class AwsDynamoDbDuplicateEventDetector implements DuplicateEventDetector {

  readonly TABLE_NAME = 'idp-hook-updates-events';
  readonly EXPIRATION_SECONDS = 6 * 60 * 60; // 6 hours;
  readonly client = new DynamoDB();

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  async isDuplicateEvent(eventId: string): Promise<boolean> {
    const item: DynamoDB.GetItemInput = {
      Key: {
        eventId: {
          S: eventId,
        },
      },
      TableName: this.TABLE_NAME,
    };
    return this.client.getItem(item).promise().then(res => !!res.Item);
  }

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  async startProcessingEvent(eventId: string): Promise<any> {
    const item: DynamoDB.PutItemInput = {
      Item: {
        eventId: {
          S: eventId,
        },
        expiration: {
          N: (Math.floor(Date.now() / 1000) + this.EXPIRATION_SECONDS).toString(),
        },
        started: {
          N: Date.now().toString(),
        },
      },
      TableName: this.TABLE_NAME,
    };
    return this.client.putItem(item).promise();
  }

  /**
   * Marks an event processing as success.
   * @param eventId
   */
  async stopProcessingEvent(eventId: string): Promise<any> {
    const item: DynamoDB.PutItemInput = {
      Item: {
        eventId: {
          S: eventId,
        },
        stopped: {
          N: Date.now().toString(),
        },
      },
      TableName: this.TABLE_NAME,
    };
    return this.client.putItem(item).promise();
  }
}
