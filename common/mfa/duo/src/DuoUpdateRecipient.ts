import { RecipientUser, UpdateRecipient } from '@core/UpdateRecipient';
import axios, { AxiosInstance } from 'axios';
import { SecretsService } from '@core/SecretsService';
import * as _ from 'lodash';
import { Helper, Profile, UserStatus } from '@core/Helper';
import { InitiatorUser } from '@core/UpdateInitiator';
import { DuoAdminAPI, DuoRequest } from './DuoAdminAPI';

interface DuoCreateUser {
  username: string;
  alias1?: string;
  alias2?: string;
  alias3?: string;
  alias4?: string;
  realname?: string;
  email?: string;
  status?: string;
  notes?: string;
  firstname?: string;
  lastname?: string;
}

export interface DuoGroup {
  group_id: string;
}

export interface DuoUser extends RecipientUser {
  user_id: string;
  username: string;
  alias1?: string;
  alias2?: string;
  alias3?: string;
  alias4?: string;
  realname?: string;
  email?: string;
  status?: string;
  notes?: string;
  firstname?: string;
  lastname?: string;
  groups: DuoGroup[];
}

/**
 * Updates Duo when hook events are processed.
 */
export class DuoUpdateRecipient implements UpdateRecipient {

  private readonly DEFAULT_LIMIT: number = 100;

  private readonly axios: AxiosInstance;
  private readonly duoAdminApi: DuoAdminAPI;

  constructor(readonly secretsService: SecretsService) {

    if (!process.env.DUO_ENDPOINT) {
      throw new Error('DUO_ENDPOINT is not set');
    }
    const integrationKey = secretsService.recipientIntegrationKey as string;
    const signatureSecret = secretsService.recipientSignatureSecret as string;
    this.duoAdminApi = new DuoAdminAPI(integrationKey, signatureSecret, process.env.DUO_ENDPOINT);

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
    const signature = this.duoAdminApi.signRequest(
      date,
      new DuoRequest('GET', '/admin/v1/users', {
        username,
      }));

    return this.axios
      .get(`/users?username=${encodeURIComponent(username)}`, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.response[0]'))
      .catch(Helper.logError);
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
    // @ts-ignore since pickBy always returns a username
    const data: DuoCreateUser = _.pickBy({
      username: user.username,
      email: user.profile?.email,
      firstname: user.profile?.firstname,
      lastname: user.profile?.lastname,
      realname: `${user.profile?.firstname || ''} ${user.profile?.middlename || ''} ${user.profile?.lastname || ''}`,
      status: this.convertToDuoStatus(user.profile?.status),
      alias1: user.profile?.alias,
    });
    return this.createWithDuoData(data);
  }

  private createWithDuoData(data: DuoCreateUser): Promise<string> {
    console.log(`Creating ${data.username} in Duo`);

    const formEncodedParams = this.duoAdminApi.convertParams(data);
    const date = new Date().toUTCString();
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'POST',
        '/admin/v1/users',
        data));

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
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'DELETE',
        `/admin/v1/users/${userId}`,
        ''));

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
    const formEncodedParams = this.duoAdminApi.convertParams(data);
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'POST',
        `/admin/v1/users/${userId}`,
        data));

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

    const data = _.pickBy({
      email: newProfileDetails.email,
      firstname: newProfileDetails.firstname,
      lastname: newProfileDetails.lastname,
      realname: `${newProfileDetails.firstname || ''} ${newProfileDetails.middlename || ''} ${newProfileDetails.lastname || ''}`,
    });
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
    if (factor === 'DUO_SECURITY' || factor === 'duo') {
      // Duo does not provide don't have a simple "reset" API
      // We can either disassociate the user from the phones, tokens and U2F tokens, one by one, using all sorts of API endpoints,
      // or, we can delete the user and recreate him immediately with the existing profile and group information.
      // for simplicity I am doing the latter.
      const existingUser = user as DuoUser;
      // delete the user. this disassociates all the phones, tokens and U2F tokens for the user
      await this.delete(user);
      // re-create the user with his existing profile
      // @ts-ignore since pickBy always returns a username
      const data: DuoCreateUser = _.pickBy({
        username: existingUser.username,
        email: existingUser.email,
        firstname: existingUser.firstname,
        lastname: existingUser.lastname,
        realname: existingUser.realname,
        status: existingUser.status,
        alias1: existingUser.alias1,
        alias2: existingUser.alias2,
        alias3: existingUser.alias3,
        alias4: existingUser.alias4,
      });
      const newUserId = await this.createWithDuoData(data);
      // add the user to all the groups he belonged to
      return Promise.all(_.map(existingUser.groups, group => this.addUserToGroupByUserIdAndGroupId(newUserId, group?.group_id)));
    }
    return Promise.resolve();
  }

  private async getGroupInfo(groupName: string): Promise<any> {
    console.log(`Get group ${groupName} info from Duo`);
    const getGroupInfoPage = async (limit: number, offset: number): Promise<any> => {
      const data = { limit, offset };
      const date = new Date().toUTCString();
      const signature = this.duoAdminApi.signRequest(
        date, new DuoRequest(
          'GET',
          '/admin/v1/groups',
          data));

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
          const duoGroup = _.find(res.data.response, group => group.name === groupName || group.desc === groupName);
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
  async addUserToGroupByUserId(userId: string, groupName: string, jit: boolean): Promise<any> {
    console.log(`Adding user ${userId} to group ${groupName} in Duo`);

    let groupId = await this.getGroupInfo(groupName);
    if (groupId === null) {
      if (jit) {
        // JIT create group
        groupId = await this.createGroup(groupName);
      } else {
        throw new Error(`Group ${groupName} not found, cannot add user ${userId}`);
      }
    }
    return this.addUserToGroupByUserIdAndGroupId(userId, groupId);
  }

  private addUserToGroupByUserIdAndGroupId(userId: string, groupId: string): Promise<any> {
    const data = { group_id: groupId };
    const date = new Date().toUTCString();
    const formEncodedParams = this.duoAdminApi.convertParams(data);
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'POST',
        `/admin/v1/users/${userId}/groups`,
        data));

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
  async addUserToGroup(user: RecipientUser, groupName: string, jit: boolean): Promise<any> {
    const duoUser = user as DuoUser;
    const userId = duoUser.user_id;
    return this.addUserToGroupByUserId(userId, groupName, jit);
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
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'DELETE',
        `/admin/v1/users/${userId}/groups/${groupId}`,
        ''));

    return this.axios
      .delete(`/users/${userId}/groups/${groupId}`, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .catch(Helper.logError);
  }

  async renameGroup(alternateId: string, name: string): Promise<any> {
    console.log(`Renaming group ${alternateId} in Duo to ${name}`);
    const groupId = await this.getGroupInfo(alternateId);
    if (groupId === null) {
      throw new Error(`Could not find group with description ${alternateId}`);
    }

    const data = { name };
    const date = new Date().toUTCString();
    const formEncodedParams = this.duoAdminApi.convertParams(data);
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'POST',
        `/admin/v1/groups/${groupId}`,
        data));

    return this.axios
      .post(`/groups/${groupId}`, formEncodedParams, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.stat'))
      .catch(Helper.logError);
  }

  async deleteGroup(name: string): Promise<any> {
    console.log(`Deleting group ${name} in Duo`);
    const groupId = await this.getGroupInfo(name);
    if (groupId === null) {
      throw new Error(`Could not find group with name ${name}`);
    }

    const date = new Date().toUTCString();
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'DELETE',
        `/admin/v1/groups/${groupId}`,
        ''));

    return this.axios
      .delete(`/groups/${groupId}`, {
        headers: {
          Date: date,
          Authorization: `Basic ${signature}`,
        },
      })
      .then((res: any) => _.get(res, 'data.stat'))
      .catch(Helper.logError);
  }

  async createGroup(name: string, alternateId?: string): Promise<any> {
    console.log(`Creating group ${name} in Duo`);

    // set the alternate id as the description so we can find it later if we only get the alternate id and not the group name
    const data: any = { name };
    if (alternateId) {
      data.desc = alternateId;
    }
    const date = new Date().toUTCString();
    const formEncodedParams = this.duoAdminApi.convertParams(data);
    const signature = this.duoAdminApi.signRequest(
      date, new DuoRequest(
        'POST',
        '/admin/v1/groups',
        data));

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
