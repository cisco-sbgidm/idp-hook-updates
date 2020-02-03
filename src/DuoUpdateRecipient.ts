import { RecipientUser, UpdateRecipient } from './UpdateRecipient';
import { URL } from 'url';
import crypto from 'crypto';
import axios, { AxiosInstance } from 'axios';
import { SecretsService } from './SecretsService';
import * as _ from 'lodash';
import { Helper, Profile, UserStatus } from './Helper';
import { InitiatorUser } from './UpdateInitiator';

export interface DuoUser extends RecipientUser {
  user_id: string;
}

/**
 * Updates Duo when hook events are processed.
 */
export class DuoUpdateRecipient implements UpdateRecipient {

  private readonly DEFAULT_LIMIT: number = 100;

  private readonly duoHostname: string;
  private readonly axios: AxiosInstance;

  constructor(readonly secretsService: SecretsService) {

    if (!process.env.DUO_ENDPOINT) {
      throw new Error('DUO_ENDPOINT is not set');
    }
    this.duoHostname = _.toLower(new URL(process.env.DUO_ENDPOINT).hostname);

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
    const signature = this.signRequest(
      date,
      'GET',
      '/admin/v1/users',
      this.convertParams({
        username,
      }),
    );

    return this.axios
      .get(`/users?username=${username}`, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.response[0]'))
      .catch(Helper.logError);
  }

  /**
   * Signs a request to Duo.
   * @param date the date value
   * @param method the HTTP method
   * @param path the Duo API path
   * @param params form encoded parameters, sorted by parameter names
   */
  private signRequest(date: string, method: string, path: string, params: string): string {
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
   * @param params parameter map to convert
   */
  private convertParams(params: any): string {
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

  private convertToDuoStatus(userStatus: UserStatus | undefined): string {
    switch (userStatus) {
      case UserStatus.ACTIVE:
        return 'active';
      case UserStatus.DISABLED:
        return 'disabled';
    }
    return 'active'; // default
  }

  /**
   * Creates a user.
   * @param user the user to create
   * @return returns the created user id
   */
  create(user: InitiatorUser): Promise<string> {
    console.log(`Creating ${user.username} in Duo`);

    const data = _.pickBy({
      username: user.username,
      email: user.profile?.email,
      firstname: user.profile?.firstname,
      lastname: user.profile?.lastname,
      realname: `${user.profile?.firstname || ''} ${user.profile?.middlename || ''} ${user.profile?.lastname || ''}`,
      status: this.convertToDuoStatus(user.profile?.status),
    });
    const formEncodedParams = this.convertParams(data);
    const date = new Date().toUTCString();
    const signature = this.signRequest(
      date,
      'POST',
      '/admin/v1/users',
      formEncodedParams,
    );

    return this.axios
      .post('/users', formEncodedParams, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.response.user_id'))
      .catch(Helper.logError);
  }

  /**
   * Deletes a user.
   * @param user the user to delete
   */
  async delete(user: RecipientUser): Promise<any> {
    const duoUser = user as DuoUser;
    const userId = duoUser.user_id;
    console.log(`Deleting ${userId} from Duo`);

    const date = new Date().toUTCString();
    const signature = this.signRequest(
      date,
      'DELETE',
      `/admin/v1/users/${userId}`,
      '',
    );

    return this.axios
      .delete(`/users/${userId}`, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.stat'))
      .catch(Helper.logError);
  }

  /**
   * Sends a "Modify RecipientUser" request
   * @param user
   * @param data
   */
  private async modifyUser(user: DuoUser, data: any) {
    const userId = user.user_id;
    const date = new Date().toUTCString();
    const formEncodedParams = this.convertParams(data);
    const signature = this.signRequest(
      date,
      'POST',
      `/admin/v1/users/${userId}`,
      formEncodedParams,
    );

    return this.axios
      .post(`/users/${userId}`, formEncodedParams, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .catch(Helper.logError);
  }

  /**
   * Update a user profile using the Duo admin API.
   * @param userToUpdate
   * @param newProfileDetails
   */
  async updateProfile(userToUpdate: RecipientUser, newProfileDetails: Profile): Promise<any> {
    const duoUser = userToUpdate as DuoUser;
    console.log(`Updating the profile of ${duoUser.user_id} in Duo`);

    const data = {
      email: newProfileDetails.email,
      firstname: newProfileDetails.firstname,
      lastname: newProfileDetails.lastname,
      realname: `${newProfileDetails.firstname || ''} ${newProfileDetails.middlename || ''} ${newProfileDetails.lastname || ''}`,
    };
    return this.modifyUser(duoUser, data);
  }

  /**
   * Disables a user.
   * @param user
   */
  async disable(user: RecipientUser): Promise<any> {
    const duoUser = user as DuoUser;
    console.log(`Disabling user ${duoUser.user_id} in Duo`);
    return this.modifyUser(duoUser, {
      status: 'disabled',
    });
  }

  /**
   * Re-enables the user.
   * @param user
   */
  async reenable(user: RecipientUser): Promise<any> {
    const duoUser = user as DuoUser;
    console.log(`Reenabling user ${duoUser.user_id} in Duo`);
    return this.modifyUser(duoUser, {
      status: 'active',
    });
  }

  /**
   * Resets a user in Duo.
   * @param user
   * @param factor the factor being reset. The reset event is ignored if the factor is not DUO_SECURITY
   */
  async resetUser(user: RecipientUser, factor: string): Promise<any> {
    if (factor === 'DUO_SECURITY') {
      // until we have a dedicated API for "reset" we delete the user in Duo
      return this.delete(user);
    }
    return Promise.resolve();
  }

  private async getGroupInfo(groupName: string): Promise<any> {
    console.log(`Get group ${groupName} info from Duo`);
    const getGroupInfoPage = async (limit: number, offset: number): Promise<any> => {
      const data = { limit, offset };
      const date = new Date().toUTCString();
      const formEncodedParams = this.convertParams(data);
      const signature = this.signRequest(
        date,
        'GET',
        '/admin/v1/groups',
        formEncodedParams,
      );

      return this.axios
        .get(`/groups?limit=${limit}&offset=${offset}`, {
          headers: {
            Date: date,
            Authorization: `Basic ${signature}`,
          },
        })
        .then((res: any) => {
          // iterate through results and match the group name
          // if the group name is not found get the next page of groups (if any) or return null
          if (res.data.stat !== 'OK') {
            console.error(res);
            throw new Error('Failed fetching groups from Duo');
          }
          const duoGroup = _.find(res.data.response, { name: groupName });
          if (duoGroup) {
            return duoGroup.group_id;
          }
          if (!_.isEmpty(res.data.response)) {
            return getGroupInfoPage(limit, offset + limit);
          }
          console.log(`Unable to find group ${groupName} in Duo`);
          return null;
        })
        .catch(Helper.logError);
    };
    return getGroupInfoPage(this.DEFAULT_LIMIT, 0);
  }

  /**
   * Adds a user to a group.
   */
  async addUserToGroupByUserId(userId: string, groupName: string): Promise<any> {
    console.log(`Adding user ${userId} to group ${groupName} in Duo`);

    let groupId = await this.getGroupInfo(groupName);
    if (groupId === null) {
      // JIT create group
      groupId = await this.createGroup(groupName);
    }

    const data = { group_id: groupId };
    const date = new Date().toUTCString();
    const formEncodedParams = this.convertParams(data);
    const signature = this.signRequest(
      date,
      'POST',
      `/admin/v1/users/${userId}/groups`,
      formEncodedParams,
    );

    return this.axios
      .post(`/users/${userId}/groups`, formEncodedParams, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .catch(Helper.logError);
  }

  /**
   * Adds a user to a group.
   */
  async addUserToGroup(user: RecipientUser, groupName: string): Promise<any> {
    const duoUser = user as DuoUser;
    const userId = duoUser.user_id;
    return this.addUserToGroupByUserId(userId, groupName);
  }

  /**
   * Removes a user from a group.
   */
  async removeUserFromGroup(user: RecipientUser, groupName: string): Promise<any> {
    const duoUser = user as DuoUser;
    const userId = duoUser.user_id;
    console.log(`Removing user ${userId} from group ${groupName} in Duo`);

    const groupId = await this.getGroupInfo(groupName);
    if (groupId === null) {
      throw new Error(`Cannot find group ${groupName}`);
    }

    const date = new Date().toUTCString();
    const signature = this.signRequest(
      date,
      'DELETE',
      `/admin/v1/users/${userId}/groups/${groupId}`,
      '',
    );

    return this.axios
      .delete(`/users/${userId}/groups/${groupId}`, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .catch(Helper.logError);
  }

  private async createGroup(name: string): Promise<any> {
    console.log(`Creating group ${name} in Duo`);

    const data = { name };
    const date = new Date().toUTCString();
    const formEncodedParams = this.convertParams(data);
    const signature = this.signRequest(
      date,
      'POST',
      '/admin/v1/groups',
      formEncodedParams,
    );

    return this.axios
      .post('/groups', formEncodedParams, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.response.group_id'))
      .catch(Helper.logError);
  }
}
