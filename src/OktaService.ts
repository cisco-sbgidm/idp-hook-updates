import { SecretsService } from './SecretsService';
import axios, { AxiosInstance } from 'axios';
import { Helper } from './Helper';

/**
 * Describes an Okta user profile
 */
export interface OktaProfile {
  login: string;
  email?: string;
  secondEmail?: string;
  firstName?: string;
  lastName?: string;
  middleName?: string;
  honorificPrefix?: string;
  honorificSuffix?: string;
  title?: string;
  displayName?: string;
  nickName?: string;
  profileUrl?: string;
  primaryPhone?: string;
  mobilePhone?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  countryCode?: string;
  postalAddress?: string;
  preferredLanguage?: string;
  locale?: string;
  timezone?: string;
  userType?: string;
  employeeNumber?: string;
  costCenter?: string;
  organization?: string;
  division?: string;
  department?: string;
  managerId?: string;
  manager?: string;
}

/**
 * Describes an Okta user
 */
export interface OktaUser {
  id: string;
  profile: OktaProfile;
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
  uuid: string;
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
      .then(res => res.data)
      .catch(Helper.logError);
  }

  async getUserGroups(userId: string): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;

    return this.axios
      .get(`/users/${userId}/groups`, {
        headers: {
          Authorization: `SSWS ${apiKey}`,
        },
      })
      .then(res => res.data)
      .catch(Helper.logError);
  }
}

export default OktaService;
