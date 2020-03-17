import * as _ from 'lodash';

const okta = require('@okta/okta-sdk-nodejs');
const duo = require('@duosecurity/duo_api');
const waitUntil = require('wait-until');

let oktaClient: any;
let duoClient: any;

const OKTA_URL = process.env.OKTA_URL;
const OKTA_TOKEN = process.env.OKTA_TOKEN;
const DUO_IKEY = process.env.DUO_IKEY;
const DUO_SKEY = process.env.DUO_SKEY;
const DUO_HOST = process.env.DUO_HOST;
const CI_USER = process.env.CI_USER;

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

function pollDuoUserUntilMatch(field: string, expectedValue: string): Promise<any> {
  return new Promise((resolve, reject) => {
    waitUntil()
      .interval(500)
      .times(10)
      .condition((cb: Function) => {
        asyncDuoJsonApiCall('GET', '/admin/v1/users', { username: CI_USER })
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

beforeAll(() => {
  oktaClient = new okta.Client({
    orgUrl: OKTA_URL,
    token: OKTA_TOKEN,
  });
  duoClient = new duo.Client(DUO_IKEY, DUO_SKEY, DUO_HOST);
});

it('should rename a user in Duo automatically after renaming in Okta', async () => {
  // get the user from Okta
  const oktaUser = await oktaClient.getUser(CI_USER);
  expect(oktaUser.profile.email).toEqual(CI_USER);

  console.log('Rename in Okta');
  const newLastName = `Test${Date.now()}`;
  oktaUser.profile.lastName = newLastName;
  await oktaUser.update();

  console.log('Wait for the user to update in Duo');
  await pollDuoUserUntilMatch('response[0].lastname', newLastName);
}, 60 * 1000);
