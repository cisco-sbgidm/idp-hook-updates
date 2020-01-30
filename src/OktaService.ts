import { SecretsService } from './SecretsServicets';
import { Service } from 'aws-sdk';
import * as _ from 'lodash';

/**
 * Describes an Okta user
 */
export interface OktaUser {
}

export interface OktaTarget {
  id: string;
  type: string;
  alternateId: string;
  displayName: string;
}

export interface OktaOutcome {
  result: string;
  reason?: string;
}

/**
 * Describes an Okta event in the hook events list
 */
export interface OktaEvent {
  eventType: string;
  target: OktaTarget[];
  outcome: OktaOutcome;
}

/**
 * Implements Okta REST API
 */
export class OktaService {
  private oktaClient: Service;

  constructor(readonly secretsService: SecretsService) {
    // define target API as service
    this.oktaClient = new Service({
      endpoint: process.env.OKTA_ENDPOINT,

      convertResponseTypes: false,

      // @ts-ignore - AWS typescript definitions don't have this, yet
      apiConfig: {
        metadata: {
          protocol: 'rest-json', // API is JSON-based
        },
        operations: {
          getUser: {
            http: {
              method: 'GET',
              requestUri: '/users/{userId}',
            },
            input: {
              type: 'structure',
              required: ['auth', 'userId'],
              members: {
                auth: {
                  // send authentication header in the HTTP request header
                  location: 'header',
                  locationName: 'Authorization',
                  sensitive: true,
                },
                userId: {
                  type: 'string',
                  location: 'uri',
                  locationName: 'userId',
                },
              },
            },
          },
        },
      },
    });

    // disable AWS region related login in the SDK
    // @ts-ignore - AWS typescript definitions don't have this, yet
    this.oktaClient.isGlobalEndpoint = true;
  }

  async getUser(userId: string): Promise<OktaUser> {
    const apiKey = this.secretsService.initiatorApiKey;

    const req = this.oktaClient
      // @ts-ignore function is automatically generated from apiConfig
      .getUser({
        userId,
        auth: `SSWS ${apiKey}`,
      });
    req.on('error', (error: any, response: any) => {
      const body = _.get(response, 'httpResponse.body');
      if (_.isObject(body)) {
        console.error(body.toString());
      }
    });
    return req.promise();
  }
}
