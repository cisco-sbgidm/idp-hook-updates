import { DuoAuthHeader } from '../setupDuo/DuoAuthHeader';
import { DuoRequest } from './DuoRequest';
// The current time, formatted as RFC 2822. This must be the same string as the "Date" header (or X-Duo-Date header).
import moment from 'moment';
import * as _ from 'lodash';
import crypto from 'crypto';
import { URL } from 'url';

/**
 * Describes Duo Admin API
 */
export class DuoAdminAPI {
  private readonly ikey: string;
  private readonly skey: string;
  private readonly adminApi: string;

  constructor(readonly adminIkey: string, readonly adminSkey: string, readonly apiHost: string) {
    this.ikey = adminIkey;
    this.skey = adminSkey;
    this.adminApi = apiHost;
  }

    /**
     * @param request
     */
  getSignedAuthHeader(request: DuoRequest): DuoAuthHeader {
    const timestamp = moment().format('ddd, DD MMM YYYY HH:mm:ss ZZ');
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
        [date, _.toUpper(request.method), _.toLower(new URL(this.adminApi).hostname), request.url, this.convertParams(request.data)],
        '\n',
    );
  }
}