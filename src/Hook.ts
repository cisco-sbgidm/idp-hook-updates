interface HttpHeaders {
  Authorization?: string;
  [key: string]: string | undefined;
}

/**
 * Describes a hook event
 */
export interface HookEvent {
  httpMethod: string;
  headers: HttpHeaders;
  body: string;
}
