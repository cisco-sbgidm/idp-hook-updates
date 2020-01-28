import { Profile, UpdateRecipient, User } from './UpdateRecipient';
import { URL } from 'url';
import crypto from 'crypto';
import { Service } from 'aws-sdk';
import axios, { AxiosInstance } from 'axios';
import { SecretsService } from './SecretsServicets';
import * as _ from 'lodash';

interface DuoUser extends User {
  user_id: string;
}

/**
 * Updates Duo when hook events are processed.
 */
export class DuoUpdateRecipient implements UpdateRecipient {

  private readonly duoHostname: string;
  private readonly duoClient: Service;
  private readonly axios: AxiosInstance;

  private secretsService: SecretsService;

  constructor(secretsService: SecretsService) {
    this.secretsService = secretsService;

    if (!process.env.DUO_ENDPOINT) {
      throw new Error('DUO_ENDPOINT is not set');
    }
    this.duoHostname = _.toLower(new URL(process.env.DUO_ENDPOINT).hostname);

    // define target API as service
    this.duoClient = new Service({
      endpoint: process.env.DUO_ENDPOINT,

      convertResponseTypes: false,

      // @ts-ignore - AWS typescript definitions don't have this, yet
      apiConfig: {
        metadata: {
          protocol: 'rest-json',
        },
        operations: {
          getUser: {
            http: {
              method: 'GET',
              requestUri: '/users',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
              },
            },
            input: {
              type: 'structure',
              required: ['auth', 'date', 'username'],
              members: {
                auth: {
                  // send authentication header in the HTTP request header
                  location: 'header',
                  locationName: 'Authorization',
                  sensitive: true,
                },
                date: {
                  location: 'header',
                  locationName: 'Date',
                },
                username: {
                  type: 'string',
                  location: 'querystring',
                  locationName: 'username',
                },
              },
            },
          },
        },
      },
    });
    // disable AWS region related login in the SDK
    // @ts-ignore - AWS typescript definitions don't have this, yet
    this.duoClient.isGlobalEndpoint = true;

    this.axios = axios.create({
      baseURL: process.env.DUO_ENDPOINT,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  }

  /**
   * Fetches the Duo user by the username.
   * @param username the username to fetch.
   */
  async getUser(username: string): Promise<DuoUser> {
    const date = new Date().toUTCString();
    const signature = await this.signRequest(
      date,
      'GET',
      '/admin/v1/users',
      this.convertParams({
        username,
      }),
    );
    return this.duoClient
      // @ts-ignore function is automatically generated from apiConfig
      .getUser({
        date,
        username,
        auth: `Basic ${signature}`,
      })
      .promise()
      .then((res: any) => _.get(res, 'response[0]'));
  }

  /**
   * Update a user profile using the Duo admin API.
   * @param userToUpdate
   * @param newProfileDetails
   */
  async updateProfile(userToUpdate: User, newProfileDetails: Profile): Promise<any> {
    const duoUser = userToUpdate as DuoUser;
    const userId = duoUser.user_id;
    const date = new Date().toUTCString();
    const data = {
      email: _.get(newProfileDetails, 'profile.email'),
      firstname: _.get(newProfileDetails, 'profile.firstName'),
      lastname: _.get(newProfileDetails, 'profile.lastName'),
      realname: `${_.get(newProfileDetails, 'profile.firstName')} ${_.get(
        newProfileDetails,
        'profile.middleName',
      )} ${_.get(newProfileDetails, 'profile.lastName')}`,
    };

    const formEncodedParams = this.convertParams(data);
    const signature = await this.signRequest(
      date,
      'POST',
      `/admin/v1/users/${userId}`,
      formEncodedParams,
    );

    // Using axios since the AWS.Service doesn't support form-encoded body
    return this.axios
      .post(`/users/${userId}`, formEncodedParams, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      });
  }

  /**
   * Signs a request to Duo.
   * @param date the date value
   * @param method the HTTP method
   * @param path the Duo API path
   * @param params form encoded parameters, sorted by parameter names
   * @private
   */
  signRequest(date: string, method: string, path: string, params: string): string {
    const integrationKey = this.secretsService.recipientIntegrationKey;
    const signatureSecret = this.secretsService.recipientSignatureSecret as string;

    const canon = _.join(
      [date, _.toUpper(method), this.duoHostname, path, params],
      '\n',
    );

    const sig = crypto
      .createHmac('sha1', signatureSecret)
      .update(canon)
      .digest('hex');

    return Buffer.from(`${integrationKey}:${sig}`).toString('base64');
  }

  /**
   * Convert a map of parameters to a form encoded string, sorted by parameter names
   * @param params paameter map to convert
   * @private
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

  create(user: User): Promise<any> {
    return Promise.resolve('todo');
  }

  delete(user: User): Promise<any> {
    return Promise.resolve('todo');
  }

  disable(user: User): Promise<any> {
    return Promise.resolve('todo');
  }

  reenable(user: User): Promise<any> {
    return Promise.resolve('todo');
  }
}
