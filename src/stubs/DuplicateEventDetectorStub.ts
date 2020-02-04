import { DuplicateEventDetector } from '../DuplicateEventDetector';

interface Event {
  started: number;
  stopped?: number;
}

interface EventsMap {
  [eventId: string]: Event;
}

/**
 * Stores event processing information in-memory
 */
export class DuplicateEventDetectorStub implements DuplicateEventDetector {

  private events: EventsMap = {};

  isDuplicateEvent(eventId: string): Promise<boolean> {
    return Promise.resolve(!!this.events.eventId);
  }

  startProcessingEvent(eventId: string): Promise<any> {
    this.events.eventId = {
      started: Date.now(),
    };
    return Promise.resolve();
  }

  successProcessingEvent(eventId: string): Promise<any> {
    this.events.eventId.stopped = Date.now();
    return Promise.resolve();
  }

  failProcessingEvent(eventId: string): Promise<any> {
    delete this.events.eventId;
    return Promise.resolve();
  }
}
