import { SecretsService } from './SecretsServicets';
import axios, { AxiosInstance } from 'axios';
import { Helper } from './Helper';

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

  private readonly axios: AxiosInstance;

  constructor(readonly secretsService: SecretsService) {
    if (!process.env.OKTA_ENDPOINT) {
      throw new Error('OKTA_ENDPOINT is not set');
    }
    this.axios = axios.create({
      baseURL: process.env.OKTA_ENDPOINT,
    });
  }

  async getUser(userId: string): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;

    return this.axios
      .get(`/users/${userId}`, {
        headers: {
          Authorization: `SSWS ${apiKey}`,
        },
      })
      .catch(Helper.logError);
  }
}
