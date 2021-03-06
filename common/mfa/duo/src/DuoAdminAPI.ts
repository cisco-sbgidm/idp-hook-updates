import * as _ from 'lodash';
import crypto from 'crypto';
import { URL } from 'url';
import { Helper } from '@core/Helper';
import axios, { AxiosInstance } from 'axios';

/**
 * Describes Duo Admin API
 */
export class DuoAdminAPI {

  private readonly DEFAULT_LIMIT: number = 100;
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

  encodeForDuo(input: string) {
    return encodeURIComponent(input)
      .replace(/!/g, '%21')
      .replace(/'/g, '%27')
      .replace(/\(/g, '%28')
      .replace(/\)/g, '%29')
      .replace(/\*/g, '%2A');
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
            (val, key) => `${this.encodeForDuo(key)}=${this.encodeForDuo(val)}`,
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

  deleteIntegration(integrationKey: string): Promise<any> {
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
    return this.postApplicationRequest(requestBody);
  }

  createWebSdk(webSdkName: string): Promise<any> {
    const requestBody = {
      type: 'websdk',
      name: webSdkName,
    };
    return this.postApplicationRequest(requestBody);
  }

  private postApplicationRequest(requestBody: any) {
    const duoRequest = new DuoRequest('POST', '/admin/v1/integrations',
                                      requestBody);
    const duoAuthHeader = this.getSignedAuthHeader(
        duoRequest);

    return this.axios
        .post<DuoCreateIntegrationResponse>(duoRequest.url, this.convertParams(requestBody), {
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

  private async getAdminApiByName(adminApiName: string): Promise<any> {
    console.log(`Get admin api ${adminApiName} from Duo`);
    const getAdminApiByNamePage = async (limit: number, offset: number): Promise<any> => {
      const data = { limit, offset };
      const duoRequest = new DuoRequest('GET', '/admin/v1/integrations', data);
      const duoAuthHeader = this.getSignedAuthHeader(
        duoRequest);
      return this.axios
        .get(`${duoRequest.url}?limit=${limit}&offset=${offset}`, {
          headers: {
            Date: `${duoAuthHeader.date}`,
            Authorization: `Basic ${duoAuthHeader.authorization}`,
          },
        })
        .then((res: any) => {
          // iterate through results and match the admin api name
          // if the admin api name is not found get the next page of admin apis (if any) or return null
          if (res.data.stat !== 'OK') {
            console.error(res);
            throw new Error('Failed fetching admin apis from Duo');
          }
          const adminApi = _.find(res.data.response, adminApi => adminApi.name === adminApiName);
          if (adminApi) {
            return adminApi.integration_key;
          }
          if (!_.isEmpty(res.data.response)) {
            return getAdminApiByNamePage(limit, offset + limit);
          }
          return null;
        })
        .catch(Helper.logError);
    };
    return getAdminApiByNamePage(this.DEFAULT_LIMIT, 0);
  }

  async setupIdpHookAdminApi(adminApiName: string): Promise<any> {
    const integrationKey = await this.getAdminApiByName(adminApiName);
    if (integrationKey) {
      console.debug(`Found admin api ${adminApiName}, deleting it`);
      await this.deleteIntegration(integrationKey);
    }
    console.debug(`Creating admin api ${adminApiName}`);
    return await this.createIdpHookAdminAPI(adminApiName);
  }
}

/**
 * Describes create admin api response
 */
export class DuoCreateIntegrationResponse {
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
