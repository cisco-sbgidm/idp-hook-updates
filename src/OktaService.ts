import { SecretsService } from './SecretsServicets';
import { Service } from 'aws-sdk';

/**
 * Describes an Okta user
 */
export interface OktaUser {
}

/**
 * Describes an Okta event in the hook events list
 */
export interface OktaEvent {
  eventType: string;
}

/**
 * Implements Okta REST API
 */
export class OktaService {
  private oktaClient: Service;

  private secretsService: SecretsService;

  constructor(secretsService: SecretsService) {
    this.secretsService = secretsService;

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

    return this.oktaClient
      // @ts-ignore function is automatically generated from apiConfig
      .getUser({
        userId,
        auth: `SSWS ${apiKey}`,
      })
      .promise();
  }
}
