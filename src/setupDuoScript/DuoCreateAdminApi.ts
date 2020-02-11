import * as _ from 'lodash';
import axios, { AxiosInstance } from 'axios';
import { DuoAdminAPI, DuoRequest } from '../DuoAdminAPI';
import { Helper } from '../Helper';

/**
 * Creates Admin API for idp hook update
 * https://duo.com/docs/adminapi#create-integration
 */

export class DuoCreateAdminApi {
  private readonly axios: AxiosInstance;

  constructor(readonly adminAPI: DuoAdminAPI) {
    this.axios = axios.create({
      baseURL: adminAPI.adminApiUrl,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
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
    const duoAuthHeader = this.adminAPI.getSignedAuthHeader(
        duoRequest);

    return this.axios
              .post<DuoCreateAdminApiResponse>(duoRequest.url, this.adminAPI.convertParams(requestBody), {
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