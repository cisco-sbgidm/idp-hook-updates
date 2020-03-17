const okta = require('@okta/okta-sdk-nodejs');
const duo = require('@duosecurity/duo_api');

let oktaClient: any;
let duoClient: any;

const OKTA_URL = process.env.OKTA_URL;
const OKTA_TOKEN = process.env.OKTA_TOKEN;
const DUO_IKEY = process.env.DUO_IKEY;
const DUO_SKEY = process.env.DUO_SKEY;
const DUO_HOST = process.env.DUO_HOST;
const CI_USER = process.env.CI_USER;

function asyncDuoJsonApiCall(method: string, path: string, params: any): Promise<any> {
  return new Promise((resolve: Function) => {
    try {
      duoClient.jsonApiCall(method, path, params, resolve);
    } catch (error) {
      resolve({
        stat: 'ERROR',
        message: error.message ? error.message : error,
      });
    }
  });
}

beforeAll(() => {
  oktaClient = new okta.Client({
    orgUrl: OKTA_URL,
    token: OKTA_TOKEN,
  });
  duoClient = new duo.Client(DUO_IKEY, DUO_SKEY, DUO_HOST);
});

it('should rename a user', async () => {
  const oktaUser = await oktaClient.getUser(CI_USER);
  console.log(oktaUser);
  expect(oktaUser.profile.email).toEqual(CI_USER);
  // oktaUser.profile.lastName = `Test${Date.now()}`;
  // await oktaUser.update();

  const duoResponse = await asyncDuoJsonApiCall('GET', '/admin/v1/users', { username: CI_USER });
  console.log(duoResponse);
  expect(duoResponse.stat).toEqual('OK');
  expect(duoResponse.response[0].username).toEqual(CI_USER);
  // expect(duoResponse.response[0].lastname).toEqual(oktaUser.profile.lastName);
});
