import { AwsDynamoDbDuplicateEventDetector } from '../AwsDynamoDbDuplicateEventDetector';

const eventId = '111';

it('should check duplicate event', async () => {
  const detector = new AwsDynamoDbDuplicateEventDetector();
  const isDuplicate = await detector.isDuplicateEvent(eventId);
  expect(isDuplicate).toEqual(false);
});

it('should start processing an event', async () => {
  const detector = new AwsDynamoDbDuplicateEventDetector();
  detector.startProcessingEvent(eventId);
});

it('should stop processing an event', async () => {
  const detector = new AwsDynamoDbDuplicateEventDetector();
  detector.stopProcessingEvent(eventId);
});
