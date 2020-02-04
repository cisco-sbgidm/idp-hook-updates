/**
 * Describes a service for detecting duplicate events
 */
export interface DuplicateEventDetector {

  /**
   * Returns true iff the event id was already processed successfully or the event processing is in progress.
   * @param eventId
   */
  isDuplicateEvent(eventId: string): Promise<boolean>;

  /**
   * Marks an event processing as in-progress.
   * @param eventId
   */
  startProcessingEvent(eventId: string): Promise<any>;

  /**
   * Marks an event processing as success.
   * @param eventId
   */
  successProcessingEvent(eventId: string): Promise<any>;

  /**
   * Marks an event processing as failed, making it a candidate for re-processing.
   * @param eventId
   */
  failProcessingEvent(eventId: string): Promise<any>;
}
