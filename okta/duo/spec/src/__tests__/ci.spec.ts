import * as _ from 'lodash';

const okta = require('@okta/okta-sdk-nodejs');
const duo = require('@duosecurity/duo_api');
const waitUntil = require('wait-until');

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
  oktaClient = new okta.Client({
    orgUrl: OKTA_URL,
    token: OKTA_TOKEN,
  });
  duoClient = new duo.Client(DUO_IKEY, DUO_SKEY, DUO_HOST);

  // get the user from Okta
  oktaUser = await oktaClient.getUser(CI_USER);
});

it('should rename a user in Duo automatically after renaming in Okta', async () => {
  console.log('Rename in Okta');
  const newLastName = `Test${Date.now()}`;
  oktaUser.profile.lastName = newLastName;
  await oktaUser.update();

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
    await oktaClient.listGroups()
      .each((group: any) => {
        if (_.get(group, 'profile.name') === CI_GROUP_NAME) {
          console.log(`Found existing group ${JSON.stringify(group)}`);
          groupId = group.id;
          return false; // stop iterating over the collection
        }
      });
    if (!groupId) {
      console.log(`Creating group ${CI_GROUP_NAME}`);
      const group = await oktaClient.createGroup({
        profile: {
          name: CI_GROUP_NAME,
        },
      });
      console.log(`Created group ${JSON.stringify(group)}`);
      groupId = group.id;
    }
  });

  afterAll(async () => {
    console.log(`Deleting group ${groupId}`);
    await oktaClient.deleteGroup(groupId);
  });

  async function getDuoUser() {
    console.log('Get the user to update in Duo');
    const res = await asyncDuoJsonApiCall('GET', '/admin/v1/users', { username: CI_USER });
    return res.response[0];
  }

  it('should add a user to a group in Duo after adding to a group in Okta', async () => {
    console.log(`Adding user ${CI_USER} to group ${groupId} in Okta`);
    await oktaClient.addUserToGroup(groupId, oktaUser.id);

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
    await oktaClient.removeGroupUser(groupId, oktaUser.id);

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
