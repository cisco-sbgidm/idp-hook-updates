import { GcpDatastoreDuplicateEventDetector } from '../GcpDatastoreDuplicateEventDetector';
import { Datastore } from '@google-cloud/datastore';
import { Entities } from '@google-cloud/datastore/build/src/entity';
import { Query } from '@google-cloud/datastore/build/src/query';

const eventId = '111';
const entityKey = {
  kind: 'idp-hook-updates-events',
  name: eventId,
  path: ['idp-hook-updates-events', eventId],
};

it('should fail when process.env.EVENTS_TABLE_NAME is not set', () => {
  try {
    new GcpDatastoreDuplicateEventDetector();
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('EVENTS_TABLE_NAME is not set');
  }
});

describe('with EVENTS_TABLE_NAME', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.EVENTS_TABLE_NAME = 'idp-hook-updates-events';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  describe('#isDuplicateEvent', () => {
    async function testDuplicate(valueToResolve: Entities, expectation: boolean) {
      // @ts-ignore
      Datastore = jest.fn(() => ({
        key: () => [],
        get: () => Promise.resolve(valueToResolve),
      }));
      const detector = new GcpDatastoreDuplicateEventDetector();
      const isDuplicate = await detector.isDuplicateEvent(eventId);
      expect(isDuplicate).toBe(expectation);
    }

    it('should return false when the event is not a duplicate', async () => {
      return testDuplicate([], false);
    });

    it('should return true when the event is a duplicate', async () => {
      return testDuplicate([{ Entity: {} }], true);
    });
  });

  it('should start processing an event', async () => {
    const entity = {
      key: entityKey,
      data: {
        started: expect.any(String),
      },
    };
    const mockSaveItem = jest.fn(() => ({
      promise: () => Promise.resolve(),
    }));
    // @ts-ignore
    Datastore = jest.fn(() => ({
      key: () => entityKey,
      save: mockSaveItem,
    }));
    const detector = new GcpDatastoreDuplicateEventDetector();
    const res = await detector.startProcessingEvent(eventId);
    expect(mockSaveItem).toHaveBeenCalledWith(entity);
  });

  it('should successfully stop processing an event', async () => {
    const entity = {
      key: entityKey,
      data: {
        stopped: expect.any(String),
      },
    };
    const mockSaveItem = jest.fn(() => ({
      promise: () => Promise.resolve(),
    }));
    // @ts-ignore
    Datastore = jest.fn(() => ({
      key: () => entityKey,
      save: mockSaveItem,
    }));
    const detector = new GcpDatastoreDuplicateEventDetector();
    const res = await detector.stopProcessingEvent(eventId);
    expect(mockSaveItem).toHaveBeenCalledWith(entity);
  });

  it('should successfully delete expired event', async () => {
    const entity = {
      key: entityKey,
      data: {
        stopped: expect.any(String),
      },
    };
    const mockDeleteItem = jest.fn(() => ({
      promise: () => Promise.resolve(),
    }));
    // @ts-ignore
    Datastore = jest.fn(() => ({
      key: () => entityKey,
      createQuery: () => new Query(),
      runQuery: () => [entity],
      delete: mockDeleteItem,
    }));
    const detector = new GcpDatastoreDuplicateEventDetector();
    await detector.deleteExpiredEvents();
    expect(mockDeleteItem).toHaveBeenCalledWith(entityKey);
  });
});
