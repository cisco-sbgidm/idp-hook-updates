import * as _ from 'lodash';
import { InitiatorUser, UpdateInitiator } from '@core/UpdateInitiator';
import { SecretsService } from '@core/SecretsService';
import { UpdateRecipient } from '@core/UpdateRecipient';
import { HookEvent } from '@core/Hook';
import { Response } from '@core/Api';
import { Helper, Profile } from '@core/Helper';
import * as uuid from 'uuid';

/**
 * Describes an Auth0 event in the hook events list
 */
export interface Auth0Event {
  request: {
    method: string;
    path: string;
    body: any;
  };
  response: {
    statusCode: number;
    body: any;
  };
}

enum Auth0EventType {
  CREATE_USER, DELETE_USER, UPDATE_USER,
  ASSIGN_ROLES_TO_USER, REMOVE_ROLES_FROM_USER,
  DELETE_USER_MFA,
  CREATE_ROLE, DELETE_ROLE, UPDATE_ROLE,
  NOT_SUPPORTED,
}

/**
 * Implements processing an Auth0 hook event
 */
export class Auth0Hooks implements UpdateInitiator {

  constructor(readonly secretsService: SecretsService,
              readonly updateRecipient: UpdateRecipient) {
  }

  /**
   * Process an Auth0 hook event.
   * @param hookEvent
   */
  async processEvent(hookEvent: HookEvent): Promise<Response> {
    const authorizationSecret = this.secretsService.recipientAuthorizationSecret;
    // authorize request
    if ((hookEvent.headers.Authorization || hookEvent.headers.authorization) !== authorizationSecret) {
      return {
        statusCode: 500,
        body: 'Invalid Authorization',
      };
    }

    const body = JSON.parse(hookEvent.body);
    // we need to process events sequentially since events in the batch might be depend on each other
    for (let i = 0; i < body.length; i += 1) {
      const event: Auth0Event = body[i];
      const eventUid = uuid.v4();
      try {
        await this.processEventFromList(event, eventUid);
      } catch (err) {
        // swallow errors otherwise Auth0 keeps sending the same batch of events over and over
        // when some of the events are processed successfully re-applying them can cause issues.
        // log them to be able to monitor and alert using external tools
        console.error({
          err,
          failedEventId: eventUid,
        });
      }
    }

    return {
      statusCode: 200,
    };
  }

  private eventType(event: Auth0Event): Auth0EventType {
    const path = _.toLower(event.request.path);
    const method = _.toLower(event.request.method);

    // handle only successful events
    if (!Helper.isHttpCodeSuccess(event.response.statusCode)) {
      return Auth0EventType.NOT_SUPPORTED;
    }

    if (method === 'post'
      && event.request.path.match(/\/api\/v2\/users$/)) {
      return Auth0EventType.CREATE_USER;
    }

    if (path.match(/\/api\/v2\/users\/[\w%]+$/)) {
      if (method === 'patch') {
        return Auth0EventType.UPDATE_USER;
      }
      if (method === 'delete') {
        return Auth0EventType.DELETE_USER;
      }
    }

    if (path.match(/\/api\/v2\/users\/[\w%]+\/roles$/)) {
      if (method === 'post') {
        return Auth0EventType.ASSIGN_ROLES_TO_USER;
      }
      if (method === 'delete') {
        return Auth0EventType.REMOVE_ROLES_FROM_USER;
      }
    }

    if (method === 'delete' && event.request.path.match(/\/api\/v2\/users\/[\w%]+\/multifactor\/duo$/)) {
      return Auth0EventType.DELETE_USER_MFA;
    }

    if (method === 'post' && event.request.path.match(/\/api\/v2\/roles$/)) {
      return Auth0EventType.CREATE_ROLE;
    }

    if (path.match(/\/api\/v2\/roles\/[\w%]+$/)) {
      if (method === 'patch') {
        return Auth0EventType.UPDATE_ROLE;
      }
      if (method === 'delete') {
        return Auth0EventType.DELETE_ROLE;
      }
    }

    return Auth0EventType.NOT_SUPPORTED;
  }

  /**
   * Process a single event from the events list
   * @param event the event to process
   */
  private async processEventFromList(event: Auth0Event, eventUid: string): Promise<any> {
    console.log(`processing event ${eventUid} with path ${event.request.path} and method ${event.request.method}`);

    switch (this.eventType(event)) {
      case Auth0EventType.CREATE_USER: {
        const userToCreate: InitiatorUser = {
          id: '',
          username: event.response.body.email,
          profile: {
            email: event.response.body.email,
            firstname: _.head(_.split(event.response.body.name, ' ')),
            lastname: _.join(_.tail(_.split(event.response.body.name, ' ')), ' '),
            // use the Auth0 userId as an alias in the update recipient
            // since update/delete events only include the user id, not the email
            alias: event.response.body.user_id,
          },
        };
        // create the user
        return this.updateRecipient.create(userToCreate);
      }
      case Auth0EventType.DELETE_USER: {
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        return this.updateRecipient.delete(recipientUser);
      }
      case Auth0EventType.UPDATE_USER: {
        // check that this event updates the email or name
        if (!event.request.body.email && !event.request.body.name && !_.isBoolean(event.request.body.blocked)) {
          console.log('this event does not update the email or name, or block a user');
          return Promise.resolve();
        }
        const userId = this.extractUidFromPath(event);
        const recipientUser = await this.updateRecipient.getUser(userId);

        // block/unblock and update profile are mutually exclusive in the Auth0 API
        // however both use the same "path" and "method", so we need to distinguish based on the "body" attributes.
        if (_.isBoolean(event.request.body.blocked)) {
          return event.request.body.blocked ? this.updateRecipient.disable(recipientUser) : this.updateRecipient.reenable(recipientUser);
        }
        const changedProfile: Profile = {};
        if (event.request.body.email) {
          changedProfile.email = event.request.body.email;
        }
        if (event.request.body.name) {
          changedProfile.firstname = _.head(_.split(event.request.body.name, ' '));
          changedProfile.lastname = _.join(_.tail(_.split(event.request.body.name, ' ')), ' ');
        }
        return this.updateRecipient.updateProfile(recipientUser, changedProfile);
      }
      case Auth0EventType.DELETE_USER_MFA: {
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        const factor = _.last(_.split(event.request.path, '/'));
        if (!factor) {
          throw new Error('could not find factor to reset in path');
        }
        return this.updateRecipient.resetUser(recipientUser, factor);
      }
      case Auth0EventType.ASSIGN_ROLES_TO_USER: {
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        for (let i = 0 ; i < event.request.body.roles.length ; i += 1) {
          const roleId = event.request.body.roles[i];
          await this.updateRecipient.addUserToGroup(recipientUser, roleId, false);
        }
        return Promise.resolve();
      }
      case Auth0EventType.REMOVE_ROLES_FROM_USER: {
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        for (let i = 0 ; i < event.request.body.roles.length ; i += 1) {
          const roleId = event.request.body.roles[i];
          await this.updateRecipient.removeUserFromGroup(recipientUser, roleId);
        }
        return Promise.resolve();
      }
      case Auth0EventType.CREATE_ROLE: {
        const roleName = event.response.body.name;
        const roleId = event.response.body.id;
        return this.updateRecipient.createGroup(roleName, roleId);
      }
      case Auth0EventType.DELETE_ROLE: {
        const roleId = this.extractUidFromPath(event);
        return this.updateRecipient.deleteGroup(roleId);
      }
      case Auth0EventType.UPDATE_ROLE: {
        const roleName = event.response.body.name;
        const roleId = event.response.body.id;
        return this.updateRecipient.renameGroup(roleId, roleName);
      }
      default: {
        console.log(`Unsupported event type for event ${eventUid}`);
        return Promise.resolve();
      }
    }
  }

  private extractUidFromPath(event: Auth0Event) {
    // e.g. "/api/v2/roles/rol_FGnicF9eJ5ds436G",
    // or   "/api/v2/users/auth0%7C5e4504b5a1d99d0e71b16a66/multifactor/duo"
    const lastPart = decodeURIComponent(_.chain(event.request.path)
      .split('/', 5)
      .last()
      .value());
    return lastPart;
  }
}
