/**
 * Describes Duo Request
 */
export class DuoRequest {
  method: string;
  url: string;
  data: any;

  constructor(readonly requestMethod: string, readonly requestUrl: string, readonly requestBody: any) {
    this.method = requestMethod;
    this.url = requestUrl;
    this.data = requestBody;
  }
}