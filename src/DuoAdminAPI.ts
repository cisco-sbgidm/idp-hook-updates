import * as _ from 'lodash';
import crypto from 'crypto';
import { URL } from 'url';

/**
 * Describes Duo Admin API
 */
export class DuoAdminAPI {

  constructor(readonly adminIkey: string, readonly adminSkey: string, readonly adminApiUrl: string) {}

    /**
     * @param request
     */
  getSignedAuthHeader(request: DuoRequest): DuoAuthHeader {
    const timestamp = new Date().toUTCString();
    return {
      date: timestamp,
      authorization: this.signRequest(timestamp, request),
    };
  }

  /**
   * Convert a map of parameters to a form encoded string, sorted by parameter names
   * @param params parameter map to convert
   */
  convertParams(params: any): string {
    return _.chain(params)
        .toPairs()
        .sortBy(0)
        .fromPairs()
        .map(
            (val, key) => `${encodeURIComponent(key)}=${encodeURIComponent(val)}`,
        )
        .join('&')
        .value();
  }

  /**
   * Signs a request to Duo.
   * @param date the date value
   * @param request
   */
  signRequest(date: string, request: DuoRequest): string {
    const integrationKey = this.adminIkey;
    const signatureSecret = this.adminSkey;

    const canon = this.getCanon(date, request);
    const sig = crypto
        .createHmac('sha1', signatureSecret)
        .update(canon)
        .digest('hex');

    return Buffer.from(`${integrationKey}:${sig}`).toString('base64');
  }

  private getCanon(date: string, request: DuoRequest) {
    return _.join(
        [date, _.toUpper(request.method), _.toLower(new URL(this.adminApiUrl).hostname), request.url, this.convertParams(request.data)],
        '\n',
    );
  }
}

/**
 * Describes Duo Admin API Request
 */
export class DuoRequest {
  constructor(readonly method: string, readonly url: string, readonly data: any) {}
}

/**
 * Describes Duo Auth Headers
 */
export interface DuoAuthHeader {
  date: string;
  authorization: string;
}