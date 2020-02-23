import * as _ from 'lodash';
import crypto from 'crypto';
import { URL } from 'url';
import { Helper } from './Helper';
import axios, { AxiosInstance } from 'axios';

/**
 * Describes Duo Admin API
 */
export class DuoAdminAPI {

  private readonly axios: AxiosInstance;

  constructor(readonly adminIkey: string, readonly adminSkey: string, readonly adminApiUrl: string) {
    this.axios = axios.create({
      baseURL: adminApiUrl,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

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

  deleteAdminApi(integrationKey: string): Promise<any> {
    const duoRequest = new DuoRequest('DELETE', `/admin/v1/integrations/${integrationKey}`, '');
    const duoAuthHeader = this.getSignedAuthHeader(
        duoRequest);
    return this.axios
        .delete(duoRequest.url, {
          headers: {
            Date: `${duoAuthHeader.date}`,
            Authorization: `Basic ${duoAuthHeader.authorization}`,
          },
        })
        .then((res: any) => _.get(res, 'data.stat'))
        .catch(Helper.logError);
  }

  createIdpHookAdminAPI(adminApiName: string): Promise<any> {
    const requestBody = {
      type: 'adminapi',
      name: adminApiName,
      adminapi_read_resource: 1,
      adminapi_write_resource: 1,
    };
    const duoRequest = new DuoRequest('POST', '/admin/v1/integrations',
                                      requestBody);
    const duoAuthHeader = this.getSignedAuthHeader(
        duoRequest);

    return this.axios
        .post<DuoCreateAdminApiResponse>(duoRequest.url, this.convertParams(requestBody), {
          headers: {
            Date: `${duoAuthHeader.date}`,
            Authorization: `Basic ${duoAuthHeader.authorization}`,
          },
        })
        .then((res: any) => {
          return {
            integrationKey: _.get(res, 'data.response.integration_key', ''),
            secretKey: _.get(res, 'data.response.secret_key', ''),
            name: _.get(res, 'data.response.name', ''),
          };
        }).catch(Helper.logError);
  }
}

/**
 * Describes create admin api response
 */
export class DuoCreateAdminApiResponse {
  constructor(readonly ikey: string, readonly skey: string, readonly adminName: string) {}
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