import { CacheDuplicateEventDetector } from '../CacheDuplicateEventDetector';

const eventId = '111';

describe('Test CacheDuplicateEventDetector', () => {
  const detector = new CacheDuplicateEventDetector();
  beforeEach(async() => {
    jest.resetModules();
    await detector.clear();
  });

  describe('#isDuplicateEvent', () => {
    async function testDuplicate(eventIdToValidate: string, exception: boolean) {
      if (exception) {
        await detector.startProcessingEvent(eventIdToValidate);
      }
      const isDuplicate = await detector.isDuplicateEvent(eventIdToValidate);
      expect(isDuplicate).toBe(exception);
    }

    it('should return false when the event is not a duplicate', async () => {
      return testDuplicate(eventId, false);
    });

    it('should return true when the event is a duplicate', async () => {
      return testDuplicate(eventId, true);
    });
  });
});
