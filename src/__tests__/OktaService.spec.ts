import { OktaService } from '../OktaService';
import { SecretsServiceStub } from '../stubs/SecretsServiceStub';
import axios from 'axios';

jest.mock('axios');

const secretsServiceStub = new SecretsServiceStub();

it('should fail when process.env.OKTA_ENDPOINT is not set', () => {
  try {
    new OktaService(secretsServiceStub);
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('OKTA_ENDPOINT is not set');
  }
});

describe('with OKTA_ENDPOINT', () => {

  const OLD_ENV = process.env;
  const OLD_ERROR = console.error;
  const resolvedUser = { uid: '111' };
  const userId = 'foo';

  let getFn: any;
  let errorMessages: string[];

  beforeEach(() => {
    jest.resetModules(); // this is important - it clears the cache
    process.env = { ...OLD_ENV };
    process.env.OKTA_ENDPOINT = 'https://test.com';

    errorMessages = [];
    console.error = msg => errorMessages.push(msg);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    console.error = OLD_ERROR;
  });

  it('should return the user from Okta', async () => {
    getFn = jest.fn(() => Promise.resolve({ data: resolvedUser }));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      get: getFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const user = await oktaService.getUser(userId);
    expect(user).toEqual(resolvedUser);
    expect(getFn).toHaveBeenCalledWith(`/users/${userId}`, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
  });

  it('should return the user groups from Okta', async () => {
    const userGroups = [
      {
        type: 'BUILT_IN',
        profile: {
          name: 'Everyone',
        },
      },
      {
        type: 'OKTA_GROUP',
        profile: {
          name: 'Test',
        },
      },
    ];
    getFn = jest.fn(() => Promise.resolve({ data: userGroups }));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      get: getFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const retrievedUserGroups = await oktaService.getUserGroups(userId);
    expect(retrievedUserGroups).toEqual(userGroups);
    expect(getFn).toHaveBeenCalledWith(`/users/${userId}/groups`, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
  });

  it('should log and throw error when the call fails', async (done) => {
    const axiosError = {
      response: {
        data: 'data',
        status: 500,
        headers: ['foo', 'bar'],
      },
    };
    getFn = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      get: getFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const user = await oktaService.getUser(userId)
      .catch((err) => {
        expect(getFn).toHaveBeenCalledWith(`/users/${userId}`, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
        expect(errorMessages).toEqual([
          axiosError.response.data,
          axiosError.response.status,
          axiosError.response.headers,
        ]);
        done();
      });
  });
});
