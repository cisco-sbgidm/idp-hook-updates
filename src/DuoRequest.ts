/**
 * Describes Duo Request
 */
export class DuoRequest {
  method: string;
  url: string;
  data: any;

  constructor(requestMethod: string, requestUrl: string, requestBody: any) {
    this.method = requestMethod;
    this.url = requestUrl;
    this.data = requestBody;
  }
}