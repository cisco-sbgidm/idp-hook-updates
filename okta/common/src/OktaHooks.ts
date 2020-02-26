import * as _ from 'lodash';
import { InitiatorUser, UpdateInitiator } from '@core/UpdateInitiator';
import { SecretsService } from '@core/SecretsService';
import { UpdateRecipient } from '@core/UpdateRecipient';
import { OktaEvent, OktaService, OktaTarget, OktaUser } from './OktaService';
import { HookEvent } from '@core/Hook';
import { Response } from '@core/Api';
import { DuplicateEventDetector } from '@core/DuplicateEventDetector';
import { Profile, UserStatus } from '@core/Helper';

/**
 * Implements processing an Okta hook event
 */
export class OktaHooks implements UpdateInitiator {

  private oktaService: OktaService;

  constructor(readonly secretsService: SecretsService,
              readonly updateRecipient: UpdateRecipient,
              readonly duplicateEventDetector: DuplicateEventDetector) {
    this.oktaService = new OktaService(secretsService);
  }

  /**
   * Process an Okta hook event.
   * @param hookEvent
   */
  async processEvent(hookEvent: HookEvent): Promise<Response> {
    const authorizationSecret = this.secretsService.recipientAuthorizationSecret;

    // authorize request
    if (hookEvent.headers.Authorization !== authorizationSecret) {
      return this.respondWithError('Invalid Authorization');
    }

    const body = JSON.parse(hookEvent.body);
    await Promise.all(_.map(_.get(body, 'data.events'), (event: OktaEvent) => this.processEventFromList(event)));
    const response = {
      statusCode: 200,
    };
    return response;
  }

  /**
   * Process a single event from the events list
   * @param event the event to process
   */
  private async processEventFromList(event: OktaEvent): Promise<any> {
    console.log(`processing event ${event.uuid} of type ${event.eventType}`);
    if (await this.duplicateEventDetector.isDuplicateEvent(event.uuid)) {
      console.log('Duplicate event, bailing');
      return Promise.resolve();
    }

    await this.duplicateEventDetector.startProcessingEvent(event.uuid);
    try {
      const userTarget = this.getUserTarget(event);
      const recipientUser = await this.updateRecipient.getUser(userTarget.alternateId);

      switch (event.eventType) {
        case 'user.lifecycle.create': {
          const userToCreate: InitiatorUser = await this.fetchUser(userTarget.alternateId);
          // create the user
          const recipientUserId = await this.updateRecipient.create(userToCreate);
          // add the user groups to the user
          const userGroups = await this.oktaService.getUserGroups(userToCreate.id);
          return Promise.all(
            _.chain(userGroups)
              .filter({ type: 'OKTA_GROUP' })
              .map(group => group.profile.name)
              .map(groupName => this.updateRecipient.addUserToGroupByUserId(recipientUserId, groupName, true))
              .value());
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
          // e.g. "requestUri": "/api/v1/users/000userid111",
          const userId = _.chain(_.get(event, 'debugContext.debugData.requestUri'))
            .split('/')
            .last()
            .value();

          // When a profile is changed Okta doesn't include the changed profile fields, so we need to fetch the user profile from Okta.
          const changedProfile: Profile = await this.fetchUserProfile(userId);
          // Might be useful to use the changed attributes: _.get(event, 'debugContext.debugData.changedAttributes')
          return this.updateRecipient.updateProfile(recipientUser, changedProfile);
        }
        case 'user.mfa.factor.deactivate': {
          // parse the factors from the event, has to be done using string manipulation until the API provides this information explicitly
          const reason = event.outcome.reason;
          if (!reason) {
            throw new Error(`expected a reason in the MFA reset outcome ${event.outcome}`);
          }
          const match = reason.match(/RecipientUser reset (\w+) factor/);
          if (!match) {
            throw new Error(`expected a factor in the MFA reset reason ${JSON.stringify(reason)}`);
          }
          const factor = match[1];
          return this.updateRecipient.resetUser(recipientUser, factor);
        }
        case 'group.user_membership.add': {
          const groupName = this.getGroupName(event);
          return this.updateRecipient.addUserToGroup(recipientUser, groupName, true);
        }
        case 'group.user_membership.remove': {
          const groupName = this.getGroupName(event);
          return this.updateRecipient.removeUserFromGroup(recipientUser, groupName);
        }
        default: {
          throw new Error(`Unsupported event type ${event.eventType}`);
        }
      }
    } finally {
      console.log('Stop processing event');
      await this.duplicateEventDetector.stopProcessingEvent(event.uuid);
    }
  }

  private async fetchUser(userId: string): Promise<InitiatorUser> {
    return this.oktaService.getUser(userId)
      .then((oktaUser: OktaUser) => {
        const user: InitiatorUser = {
          id: oktaUser.id,
          profile: {
            email: oktaUser.profile.email,
            firstname: oktaUser.profile.firstName,
            lastname: oktaUser.profile.lastName,
            middlename: oktaUser.profile.middleName,
            status: UserStatus.ACTIVE,
          },
          username: oktaUser.profile.login,
        };
        return Promise.resolve(user);
      });
  }

  /**
   * Fetches a user profile from Okta.
   * @param userId
   */
  private async fetchUserProfile(userId: string): Promise<Profile> {
    return this.oktaService.getUser(userId)
      .then((oktaUser: OktaUser) => {
        const profile: Profile = {
          email: oktaUser.profile.email,
          firstname: oktaUser.profile.firstName,
          lastname: oktaUser.profile.lastName,
          middlename: oktaUser.profile.middleName,
        };
        return Promise.resolve(profile);
      });
  }

  /**
   * Returns an error response with the supplied message
   * @param msg the error message to include in the response
   */
  private respondWithError(msg: string): Response {
    console.error(`Responding with error: ${msg}`);
    const response = {
      statusCode: 500,
      body: msg,
    };
    return response;
  }

  private getUserTarget(event: OktaEvent): OktaTarget {
    const userTarget = _.find(event.target, { type: 'User' });
    if (!userTarget) {
      throw new Error(`Unable to find target user in event target ${event.target}`);
    }
    return userTarget;
  }

  private getGroupName(event: OktaEvent): string {
    const userGroup = _.find(event.target, { type: 'UserGroup' });
    if (!userGroup) {
      throw new Error(`Unable to find target user-group in event target ${event.target}`);
    }
    return userGroup.displayName;
  }
}
