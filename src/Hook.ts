interface HttpHeaders {
  [key: string]: string;
}

/**
 * Describes a hook event
 */
export interface HookEvent {
  httpMethod: string;
  headers: HttpHeaders;
  body: string;
}
