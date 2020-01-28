import * as _ from 'lodash';
import { UpdateInitiator } from './UpdateInitiator';
import { SecretsService } from './SecretsServicets';
import { UpdateRecipient } from './UpdateRecipient';
import { OktaEvent, OktaService, OktaUser } from './OktaService';
import { HookEvent } from './Hook';
import { Response } from './AwsApiGateway';

/**
 * Implements processing an Okta hook event
 */
export class OktaHooks implements UpdateInitiator {

  private secretsService: SecretsService;
  private updateRecipient: UpdateRecipient;
  private oktaService: OktaService;

  constructor(secretsService: SecretsService, updateRecipient: UpdateRecipient) {
    this.secretsService = secretsService;
    this.updateRecipient = updateRecipient;
    this.oktaService = new OktaService(secretsService);
  }

  async processEvent(hookEvent: HookEvent): Promise<Response> {
    const authorizationSecret = this.secretsService.recipientAuthorizationSecret;

    // authorize request
    if (_.get(hookEvent, 'headers.Authorization') !== authorizationSecret) {
      return this.respondWithError('Invalid Authorization');
    }

    const body = JSON.parse(hookEvent.body);

    // TODO check for duplicate messages, do we need to check body.eventId or each uuid in the events array?

    await Promise.all(_.map(_.get(body, 'data.events'), (event: OktaEvent) => this.processEventFromList(event)));

    const response = {
      statusCode: 200,
    };
    return response;
  }

  /**
   * Process a single event form the events list
   * @param event the event to process
   * @private
   */
  async processEventFromList(event: OktaEvent): Promise<any> {
    // TODO verify we can only have one "target" for these events
    const username = _.get(event, 'target[0].alternateId');
    const recipientUser = await this.updateRecipient.getUser(username);

    switch (event.eventType) {
      case 'user.lifecycle.create': {
        return this.updateRecipient.create(recipientUser);
      }
      case 'user.lifecycle.delete.initiated': {
        return this.updateRecipient.delete(recipientUser);
      }
      case 'user.lifecycle.suspend': {
        return this.updateRecipient.disable(recipientUser);
      }
      case 'user.lifecycle.unsuspend': {
        // TODO do we need "user.lifecycle.activate" here?
        return this.updateRecipient.reenable(recipientUser);
      }
      case 'user.account.update_profile': {
        // e.g. "requestUri": "/api/v1/users/00upagci4eWSXtW7a0h7",
        const userId = _.chain(_.get(event, 'debugContext.debugData.requestUri'))
          .split('/')
          .last()
          .value();

        // When a profile is changed Okta doesn't include the changed profile fields, so we need to fetch the user profile from Okta.
        const oktaUserProfile = await this.fetchUserProfile(userId);
        // const changedAttributes = _.get(event, 'debugContext.debugData.changedAttributes');
        return this.updateRecipient.updateProfile(recipientUser, oktaUserProfile);
      }
      default: {
        throw new Error(`Unsupported event type ${event.eventType}`);
      }
    }
  }

  /**
   * Fetches a user profile from Okta.
   * @param userId
   * @private
   */
  async fetchUserProfile(userId: string): Promise<OktaUser> {
    return this.oktaService.getUser(userId);
  }

  /**
   * Returns an error response with the supplied message
   * @param msg the error message to include in the response
   * @private
   */
  respondWithError(msg: string): Response {
    const response = {
      statusCode: 500,
      body: msg,
    };
    return response;
  }
}
