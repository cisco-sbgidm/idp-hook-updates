import { IncomingHttpHeaders } from 'http';

/**
 * Describes a hook event
 */
export interface HookEvent {
  httpMethod: string;
  headers: IncomingHttpHeaders;
  body: string;
}
