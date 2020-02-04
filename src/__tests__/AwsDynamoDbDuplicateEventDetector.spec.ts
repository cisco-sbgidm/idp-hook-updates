import { AwsDynamoDbDuplicateEventDetector } from '../AwsDynamoDbDuplicateEventDetector';
import awsSdk from 'aws-sdk';
import { GetItemOutput } from 'aws-sdk/clients/dynamodb';

jest.mock('aws-sdk');

const eventId = '111';

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
  await detector.successProcessingEvent(eventId);
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

it('should stop processing a failed event', async () => {
  const mockDeleteItem = jest.fn(() => ({
    promise: () => Promise.resolve(),
  }));
  // @ts-ignore
  awsSdk.DynamoDB = jest.fn(() => ({
    deleteItem: mockDeleteItem,
  }));

  const detector = new AwsDynamoDbDuplicateEventDetector();
  await detector.failProcessingEvent(eventId);
  expect(mockDeleteItem).toHaveBeenCalledWith({
    Key: {
      eventId: {
        S: eventId,
      },
    },
    TableName: 'idp-hook-updates-events',
  });
});
