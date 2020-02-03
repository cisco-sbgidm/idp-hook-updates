/**
 * Describes a service for detecting duplicate events
 */
export interface DuplicateEventDetector {

  /**
   * Returns true iff the event id was already processed or the event processing is in progress.
   * @param eventId
   */
  isDuplicateEvent(eventId: string): Promise<boolean>;

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  startProcessingEvent(eventId: string): Promise<any>;

  /**
   * Marks an event prcoessing as done.
   * @param eventId
   */
  stopProcessingEvent(eventId: string): Promise<any>;
}
