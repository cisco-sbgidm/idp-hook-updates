import { AwsDynamoDbDuplicateEventDetector } from '@src/AwsDynamoDbDuplicateEventDetector';
import awsSdk from 'aws-sdk';
import { GetItemOutput } from 'aws-sdk/clients/dynamodb';

jest.mock('aws-sdk');

const eventId = '111';

it('should fail when process.env.EVENTS_TABLE_NAME is not set', () => {
  try {
    new AwsDynamoDbDuplicateEventDetector();
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('EVENTS_TABLE_NAME is not set');
  }
});

describe('with EVENTS_TABLE_NAME', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // this is important - it clears the cache
    process.env = { ...OLD_ENV };
    process.env.EVENTS_TABLE_NAME = 'idp-hook-updates-events';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('#isDuplicateEvent', () => {
    async function testDuplicate(valueToResolve: GetItemOutput, expectation: boolean) {
      // @ts-ignore
      awsSdk.DynamoDB = jest.fn(() => ({
        getItem: () => ({
          promise: jest.fn(() => Promise.resolve(valueToResolve)),
        }),
      }));

      const detector = new AwsDynamoDbDuplicateEventDetector();
      const isDuplicate = await detector.isDuplicateEvent(eventId);
      expect(isDuplicate).toBe(expectation);
    }

    it('should return false when the event is not a duplicate', async () => {
      return testDuplicate({}, false);
    });

    it('should return true when the event is a duplicate', async () => {
      return testDuplicate({ Item: {} }, true);
    });
  });

  it('should start processing an event', async () => {
    const mockPutItem = jest.fn(() => ({
      promise: () => Promise.resolve(),
    }));
    // @ts-ignore
    awsSdk.DynamoDB = jest.fn(() => ({
      putItem: mockPutItem,
    }));

    const detector = new AwsDynamoDbDuplicateEventDetector();
    const res = await detector.startProcessingEvent(eventId);
    expect(mockPutItem).toHaveBeenCalledWith({
      Item: {
        eventId: {
          S: eventId,
        },
        expiration: {
          N: expect.any(String),
        },
        started: {
          N: expect.any(String),
        },
      },
      TableName: 'idp-hook-updates-events',
    });
  });

  it('should successfully stop processing an event', async () => {
    const mockPutItem = jest.fn(() => ({
      promise: () => Promise.resolve(),
    }));
    // @ts-ignore
    awsSdk.DynamoDB = jest.fn(() => ({
      putItem: mockPutItem,
    }));

    const detector = new AwsDynamoDbDuplicateEventDetector();
    await detector.stopProcessingEvent(eventId);
    expect(mockPutItem).toHaveBeenCalledWith({
      Item: {
        eventId: {
          S: eventId,
        },
        stopped: {
          N: expect.any(String),
        },
      },
      TableName: 'idp-hook-updates-events',
    });
  });
});
