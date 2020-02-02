import { DuoUpdateRecipient, DuoUser } from '../src/DuoUpdateRecipient';
import { SecretsService } from '../src/SecretsService';
import axios from 'axios';
import { Profile } from '../src/UpdateRecipient';

jest.mock('axios');

let secretsServiceStub: SecretsService;
let errorMessages: string[];

beforeAll(() => {
  secretsServiceStub = {
    init(): any {
    },
    initiatorApiKey: 'apikey',
    recipientAuthorizationSecret: 'authzsecret',
    recipientIntegrationKey: 'intgkey',
    recipientSignatureSecret: 'signsecret',
  };
});

it('should fail when process.env.DUO_ENDPOINT is not set', () => {
  try {
    new DuoUpdateRecipient(secretsServiceStub);
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('DUO_ENDPOINT is not set');
  }
});

describe('with DUO_ENDPOINT', () => {

  const OLD_ENV = process.env;
  const OLD_ERROR = console.error;
  const resolvedUser = { uid: '111' };
  const duoUser: DuoUser = { user_id: 'testuser' };
  const axiosError = {
    response: {
      data: 'data',
      status: 500,
      headers: ['foo', 'bar'],
    },
  };
  const duoHeaders = {
    headers: {
      Date: expect.any(String),
      Authorization: expect.any(String),
    },
  };

  function verifyErrorMessages() {
    expect(errorMessages).toEqual([
      axiosError.response.data,
      axiosError.response.status,
      axiosError.response.headers,
    ]);
  }

  let axiosClientFunctionMock: any;

  beforeEach(() => {
    jest.resetModules(); // this is important - it clears the cache
    process.env = { ...OLD_ENV };
    process.env.DUO_ENDPOINT = 'https://test.com';

    errorMessages = [];
    console.error = msg => errorMessages.push(msg);
  });

  afterEach(() => {
    process.env = OLD_ENV;
    console.error = OLD_ERROR;
  });

  describe('#getUser', () => {
    const username = 'username';

    it('should return the user from Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { response: [resolvedUser] } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      const user = await duoService.getUser(username);
      expect(user).toEqual(resolvedUser);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users?username=${username}`, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.getUser(username)
        .catch((err) => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users?username=${username}`, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#delete', () => {
    it('should delete the user from Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'OK' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.delete(duoUser);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      const user = await duoService.delete(duoUser)
        .catch((err) => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#updateProfile', () => {
    const newProfile: Profile = {
      email: 'foo@test.com',
      firstname: 'foo',
      lastname: 'bar',
    };
    // @ts-ignore
    const formEncodedParams = `email=${encodeURIComponent(newProfile.email)}&firstname=${newProfile.firstname}&lastname=${newProfile.lastname}&realname=${encodeURIComponent(`${newProfile.firstname}  ${newProfile.lastname}`)}`;

    it('should update the user profile in Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve());
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.updateProfile(duoUser, newProfile);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, formEncodedParams, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.updateProfile(duoUser, newProfile)
        .catch((err) => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, formEncodedParams, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#disable', () => {
    // @ts-ignore
    const formEncodedParams = 'status=disabled';

    it('should disable the user in Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve());
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.disable(duoUser);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, formEncodedParams, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.disable(duoUser)
        .catch((err) => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, formEncodedParams, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#reenable', () => {
    const formEncodedParams = 'status=active';

    it('should reenable the user in Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve());
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.reenable(duoUser);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, formEncodedParams, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.reenable(duoUser)
        .catch((err) => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, formEncodedParams, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#resetUser', () => {
    it('should not reset a user when the factor is not DUO_SECURITY', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'OK' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.resetUser(duoUser, 'DUMMY');
      expect(axiosClientFunctionMock).not.toHaveBeenCalled();
    });

    it('should reset a user when the factor is DUO_SECURITY', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'OK' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.resetUser(duoUser, 'DUO_SECURITY');
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.resetUser(duoUser, 'DUO_SECURITY')
        .catch((err) => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#addUserToGroup', () => {
    const groupId = 'baz';
    const groupName = 'new_group';

    it('should add a user to a new group', async () => {
      axiosClientFunctionMock = jest.fn((url) => {
        if (url === '/groups') {
          return Promise.resolve({ data: { response: { group_id: groupId } } });
        }
        return Promise.resolve();
      });
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'OK' } }));
      const formEncodedParams = `group_id=${groupId}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.addUserToGroup(duoUser, groupName);
      // search for group
      expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        ['/groups', `name=${groupName}`, duoHeaders], // // create new group
        [`/users/${duoUser.user_id}/groups`, formEncodedParams, duoHeaders],  // add user to group
      ]);
    });

    it('should fail to add a user to a new group when fetching the group fails and log an error', async (done) => {
      axiosClientFunctionMock = jest.fn();
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'FAIL' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      try {
        await duoService.addUserToGroup(duoUser, groupName);
      } catch (e) {
        // search for group
        expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
        expect(axiosClientFunctionMock).not.toHaveBeenCalled();
        done();
      }
    });

    it('should add a user to an existing group using paging', async () => {
      axiosClientFunctionMock = jest.fn((url) => {
        if (url === '/groups') {
          return Promise.resolve({ data: { response: { group_id: groupId } } });
        }
        return Promise.resolve();
      });
      const getClientFunctionMock = jest.fn((url) => {
        if (url === '/groups?limit=100&offset=0') {
          return Promise.resolve({ data: { stat: 'OK', response: [{ name: 'foo' }] } });
        }
        return Promise.resolve({ data: { stat: 'OK', response: [{ name: 'bar' }, { name: groupName, group_id: groupId }] } });
      });
      const formEncodedParams = `group_id=${groupId}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.addUserToGroup(duoUser, groupName);
      // search for groups using paging
      expect(getClientFunctionMock.mock.calls).toEqual([
        ['/groups?limit=100&offset=0', duoHeaders], // page 1
        ['/groups?limit=100&offset=100', duoHeaders],  // page 2
      ]);

      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}/groups`, formEncodedParams, duoHeaders);
    });
  });
});
