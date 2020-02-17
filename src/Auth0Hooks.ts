import * as _ from 'lodash';
import { InitiatorUser, UpdateInitiator } from './UpdateInitiator';
import { SecretsService } from './SecretsService';
import { UpdateRecipient } from './UpdateRecipient';
import { HookEvent } from './Hook';
import { Response } from './AwsApiGateway';
import { Helper, Profile } from './Helper';
import uuid from 'uuid';

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
    if (hookEvent.headers.Authorization !== authorizationSecret) {
      return this.respondWithError('Invalid Authorization');
    }

    const body = JSON.parse(hookEvent.body);
    await Promise.all(_.map(body, (event: Auth0Event) => this.processEventFromList(event)));
    const response = {
      statusCode: 200,
    };
    return response;
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
   * Process a single event form the events list
   * @param event the event to process
   */
  private async processEventFromList(event: Auth0Event): Promise<any> {
    const eventUid = uuid.v4();
    console.log(`processing event ${eventUid} with path ${event.request.path} and method ${event.request.method}`);

    switch (this.eventType(event)) {
      case Auth0EventType.CREATE_USER: {
        const userToCreate: InitiatorUser = {
          id: '',
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
        if (!event.request.body.email && !event.request.body.name) {
          console.log('this event does not update the email or name');
          return Promise.resolve();
        }
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        const userId = this.extractUidFromPath(event);
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
          throw new Error('could not ifnd factor to reset in path');
        }
        return this.updateRecipient.resetUser(recipientUser, factor);
      }
      case Auth0EventType.ASSIGN_ROLES_TO_USER: {
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        return Promise.all(_.map(event.request.body.roles, roleId => this.updateRecipient.addUserToGroup(recipientUser, roleId)));
      }
      case Auth0EventType.REMOVE_ROLES_FROM_USER: {
        const recipientUser = await this.updateRecipient.getUser(this.extractUidFromPath(event));
        return Promise.all(_.map(event.request.body.roles, roleId => this.updateRecipient.removeUserFromGroup(recipientUser, roleId)));
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

  /**
   * Returns an error response with the supplied message
   * @param msg the error message to include in the response
   */
  private respondWithError(msg: string): Response {
    const response = {
      statusCode: 500,
      body: msg,
    };
    return response;
  }
}
