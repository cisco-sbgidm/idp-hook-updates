import * as _ from 'lodash';

const duo = require('@duosecurity/duo_api');
const waitUntil = require('wait-until');
const okta = require('../client/okta-client');

const OKTA_URL = process.env.OKTA_URL;
const OKTA_TOKEN = process.env.OKTA_TOKEN;
const DUO_IKEY = process.env.DUO_IKEY;
const DUO_SKEY = process.env.DUO_SKEY;
const DUO_HOST = process.env.DUO_HOST;
const CI_USER = process.env.CI_USER;

const SPEC_TIMEOUT = 60 * 1000;

let oktaClient: any;
let duoClient: any;
let oktaUser: any;

function asyncDuoJsonApiCall(method: string, path: string, params: any): Promise<any> {
  return new Promise((resolve) => {
    try {
      console.log(`executing request to Duo ${method} ${path}`);
      duoClient.jsonApiCall(method, path, params, resolve);
    } catch (error) {
      resolve({
        stat: 'ERROR',
        message: error.message ? error.message : error,
      });
    }
  });
}

function pollDuoUntilMatch(method: string, path: string, params: any, field: string, expectedValue: string | undefined): Promise<any> {
  return new Promise((resolve, reject) => {
    waitUntil()
      .interval(1000)
      .times(50)
      .condition((cb: Function) => {
        asyncDuoJsonApiCall(method, path, params)
          .then((duoResponse: any) => {
            if (duoResponse.stat !== 'OK') {
              console.error(duoResponse);
              cb(false);
            } else {
              cb(_.get(duoResponse, field) === expectedValue);
            }
          });
      })
      .done((result: boolean) => {
        if (!result) {
          reject(`Field ${field} value does not match ${expectedValue}`);
        }
        resolve();
      });
  });
}

beforeAll(async () => {
  oktaClient = new okta(OKTA_URL, OKTA_TOKEN);
  duoClient = new duo.Client(DUO_IKEY, DUO_SKEY, DUO_HOST);

  // get the user from Okta
  oktaUser = await oktaClient.get(`/api/v1/users/${CI_USER}`);
});

it('should rename a user in Duo automatically after renaming in Okta', async () => {
  console.log('Rename in Okta');
  const newLastName = `Test${Date.now()}`;
  oktaUser = await oktaClient.post(`/api/v1/users/${oktaUser.id}`, {
    profile: {
      lastName: newLastName,
    },
  });

  console.log('Wait for the user to update in Duo');
  await pollDuoUntilMatch(
    'GET',
    '/admin/v1/users',
    { username: CI_USER },
    'response[0].lastname',
    newLastName);
}, SPEC_TIMEOUT);

describe('Group membership', () => {
  const CI_GROUP_NAME = 'CI Test Group';
  let groupId: string;

  beforeAll(async () => {
    const res = await oktaClient.get('/api/v1/groups', { q: CI_GROUP_NAME });
    if (_.isEmpty(res)) {
      console.log(`Creating group ${CI_GROUP_NAME}`);
      const group = await oktaClient.post('/api/v1/groups', {
        profile: {
          name: CI_GROUP_NAME,
        },
      });
      console.log(`Created group ${JSON.stringify(group)}`);
      groupId = group.id;
    } else {
      console.log(`Found existing group ${JSON.stringify(res)}`);
      groupId = res[0].id;
    }
  });

  afterAll(async () => {
    console.log(`Deleting group ${groupId}`);
    await oktaClient.delete(`/api/v1/groups/${groupId}`);
  });

  async function getDuoUser() {
    console.log('Get the user to update in Duo');
    const res = await asyncDuoJsonApiCall('GET', '/admin/v1/users', { username: CI_USER });
    return res.response[0];
  }

  it('should add a user to a group in Duo after adding to a group in Okta', async () => {
    console.log(`Adding user ${CI_USER} to group ${groupId} in Okta`);
    await oktaClient.put(`/api/v1/groups/${groupId}/users/${oktaUser.id}`);

    const duoUser = await getDuoUser();
    console.log('Wait for the user to update in Duo');
    await pollDuoUntilMatch(
      'GET',
      `/admin/v1/users/${duoUser.user_id}/groups`,
      {},
      'response[0].name',
      CI_GROUP_NAME);
  }, SPEC_TIMEOUT);

  it('should remove a user from a group in Duo after removing from a group in Okta', async () => {
    console.log(`Removing user ${CI_USER} from group ${groupId} in Okta`);
    await oktaClient.delete(`/api/v1/groups/${groupId}/users/${oktaUser.id}`);

    const duoUser = await getDuoUser();
    console.log('Wait for the user to update in Duo');
    await pollDuoUntilMatch(
      'GET',
      `/admin/v1/users/${duoUser.user_id}/groups`,
      {},
      'response[0]',
      undefined);
  }, SPEC_TIMEOUT);
});

describe('User status', () => {
  it('should disable a user in Duo after suspending the user in Okta', async () => {
    console.log(`Suspend user ${CI_USER} in Okta`);
    await oktaClient.post(`/api/v1/users/${oktaUser.id}/lifecycle/suspend`);

    console.log('Wait for the user to be disabled in Duo');
    await pollDuoUntilMatch(
      'GET',
      '/admin/v1/users',
      { username: CI_USER },
      'response[0].status',
      'disabled');
  }, SPEC_TIMEOUT);

  it('should enable a user in Duo after un-suspending the user in Okta', async () => {
    console.log(`Un-suspend user ${CI_USER} in Okta`);
    await oktaClient.post(`/api/v1/users/${oktaUser.id}/lifecycle/unsuspend`);

    console.log('Wait for the user to be active in Duo');
    await pollDuoUntilMatch(
      'GET',
      '/admin/v1/users',
      { username: CI_USER },
      'response[0].status',
      'active');
  }, SPEC_TIMEOUT);
});
