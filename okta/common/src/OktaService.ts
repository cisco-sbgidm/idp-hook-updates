import { SecretsService } from '@core/SecretsService';
import axios, { AxiosInstance } from 'axios';
import { Helper } from '@core/Helper';
import * as _ from 'lodash';

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

export interface OktaEventHook {
  id: string;
  status: string;
  name: string;
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

  async getEventHooks(): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;

    return this.axios
      .get('/eventHooks', {
        headers: {
          Authorization: `SSWS ${apiKey}`,
        },
      })
      .then(res => res.data)
      .catch(Helper.logError);
  }

  async deleteEventHook(eventHookId: string): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;

    return this.axios
        .delete(`/eventHooks/${eventHookId}`, {
          headers: {
            Authorization: `SSWS ${apiKey}`,
          },
        })
        .then(res => res.data)
        .catch(Helper.logError);
  }

  async createEventHook(eventHookName: string, eventHookEndpoint: string): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;
    const apiSecret = this.secretsService.recipientSignatureSecret;

    return this.axios
      .post('/eventHooks', {
        name: eventHookName,
        events: {
          type: 'EVENT_TYPE',
          items: [
            'user.lifecycle.create',
            'user.lifecycle.delete.initiated',
            'user.lifecycle.suspend',
            'user.lifecycle.unsuspend',
            'user.account.update_profile',
            'group.user_membership.add',
            'group.user_membership.remove',
            'user.mfa.factor.deactivate',
          ],
        },
        channel: {
          type: 'HTTP',
          version: '1.0.0',
          config: {
            uri: eventHookEndpoint,
            authScheme: {
              type: 'HEADER',
              key: 'Authorization',
              value: apiSecret,
            },
          },
        },
      },    {
        headers: {
          Authorization: `SSWS ${apiKey}`,
          'Content-Type': 'application/json',
        },
      })
      .then(res => res.data)
      .catch(Helper.logError);
  }

  async deactivateEventHook(eventHookId: string): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;
    const apiSecret = this.secretsService.recipientSignatureSecret;

    return this.axios
      .post(`/eventHooks/${eventHookId}/lifecycle/deactivate`, null, {
        headers: {
          Authorization: `SSWS ${apiKey}`,
        },
      })
      .then(res => res.data)
      .catch(Helper.logError);
  }

  async verifyEventHook(eventHookId: string): Promise<any> {
    const apiKey = this.secretsService.initiatorApiKey;
    const apiSecret = this.secretsService.recipientSignatureSecret;

    return this.axios
      .post(`/eventHooks/${eventHookId}/lifecycle/verify`, null, {
        headers: {
          Authorization: `SSWS ${apiKey}`,
        },
      })
      .then(res => res.data)
      .catch(Helper.logError);
  }

  async setupEventHook(eventHookName: string, eventHookEndpoint: string) {
    console.debug('getting registered event hooks from okta');
    const eventHooks: OktaEventHook[] = await this.getEventHooks();
    const eventHookId: string | undefined = _.get(_.find(eventHooks, { name: eventHookName }), 'id');
    if (eventHookId) {
      console.debug(`found existing event hook with name: "${eventHookName}", deactivate it`);
      await this.deactivateEventHook(eventHookId);
      console.debug(`delete event hook with name: "${eventHookName}"`);
      await this.deleteEventHook(eventHookId);
    }
    console.debug('create event hook');
    const eventHook :OktaEventHook = await this.createEventHook(eventHookName, eventHookEndpoint);
    console.debug('verify event hook');
    await this.verifyEventHook(eventHook.id);
  }
}

export default OktaService;
