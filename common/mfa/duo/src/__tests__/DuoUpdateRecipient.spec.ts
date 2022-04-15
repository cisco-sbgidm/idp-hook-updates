import { DuoUpdateRecipient, DuoUser } from '../DuoUpdateRecipient';
import { SecretsServiceStub } from '@core/stubs/SecretsServiceStub';
import axios from 'axios';
import { Profile, UserStatus } from '@core/Helper';
import { InitiatorUser } from '@core/UpdateInitiator';

jest.mock('axios');

const secretsServiceStub = new SecretsServiceStub();
let errorMessages: string[];

it('should fail when process.env.DUO_ENDPOINT is not set', () => {
  try {
    new DuoUpdateRecipient(secretsServiceStub);
    fail('should throw error');
  } catch (e) {
    expect((e as any).message).toEqual('DUO_ENDPOINT is not set');
  }
});

describe('with DUO_ENDPOINT', () => {

  const OLD_ENV = process.env;
  const OLD_ERROR = console.error;
  const resolvedUser = { uid: '111' };
  const duoUser: DuoUser = {
    groups: [{ group_id: 'somegrp' }],
    username: 'testuser',
    user_id: 'testuser',
  };
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

  describe('#create', () => {
    it('should create the user in Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { response: duoUser } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      const userToCreate: InitiatorUser = {
        id: '111',
        profile: {
          firstname: 'foo',
          lastname: 'bar',
          email: 'foo.bar@test.com',
          status: UserStatus.ACTIVE,
        },
      };
      const userId = await duoService.create(userToCreate);
      expect(userId).toEqual(duoUser.user_id);
      // @ts-ignore
      expect(axiosClientFunctionMock).toHaveBeenCalledWith('/users', `email=${encodeURIComponent(userToCreate.profile.email)}&firstname=${userToCreate.profile.firstname}&lastname=${userToCreate.profile.lastname}&realname=${encodeURIComponent(`${userToCreate.profile.firstname}  ${userToCreate.profile.lastname}`)}&status=active`, duoHeaders);
    });
  });

  describe('#getUser', () => {
    const username = 'username+plus@example.com';

    it('should return the user from Duo', async () => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { response: [resolvedUser] } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      const user = await duoService.getUser(username);
      expect(user).toEqual(resolvedUser);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users?username=${encodeURIComponent(username)}`, duoHeaders);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.getUser(username)
        .catch(() => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users?username=${encodeURIComponent(username)}`, duoHeaders);
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
      await duoService.delete(duoUser)
        .catch(() => {
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
        .catch(() => {
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
        .catch(() => {
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
        .catch(() => {
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

    it.each(
      [
        ['DUO_SECURITY'],
        ['duo'],
      ],
    )('should reset a user when the factor is %s', async (factor: string) => {
      axiosClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'OK' } }));
      const axiosPostFunctionMock = jest.fn((uri) => {
        if (uri === '/users') {
          return Promise.resolve({ data: { response: duoUser } });
        }
        return Promise.resolve();
      });
      // @ts-ignore
      axios.create = jest.fn(() => ({
        post: axiosPostFunctionMock,
        delete: axiosClientFunctionMock,
      }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.resetUser(duoUser, factor);
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, duoHeaders);
      // @ts-ignore
      expect(axiosPostFunctionMock.mock.calls).toEqual(
        [
          ['/users', `username=${duoUser.username}`, duoHeaders], // create user
          [`/users/${duoUser.user_id}/groups`, `group_id=${duoUser.groups[0].group_id}`, duoHeaders], // add user to group
        ]);
    });

    it('should log and throw error when the call fails', async (done) => {
      axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
      // @ts-ignore
      axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);
      await duoService.resetUser(duoUser, 'DUO_SECURITY')
        .catch(() => {
          expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}`, duoHeaders);
          verifyErrorMessages();
          done();
        });
    });
  });

  describe('#removeUserFromGroup', () => {
    const groupId = 'baz';
    const groupName = 'new_group';

    it('should remove a user from a new group', async () => {
      const getClientFunctionMock = jest.fn(() => Promise.resolve({
        data: {
          stat: 'OK',
          response: [{ name: groupName, group_id: groupId }],
        },
      }));
      axiosClientFunctionMock = jest.fn(() => Promise.resolve());
      // @ts-ignore
      axios.create = jest.fn(() => ({
        get: getClientFunctionMock,
        delete: axiosClientFunctionMock,
      }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.removeUserFromGroup(duoUser, groupName);

      // search for group
      expect(getClientFunctionMock).toBeCalledWith('/groups?limit=100&offset=0', duoHeaders);
      // remove user from group
      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}/groups/${groupId}`, duoHeaders);
    });

    it('should fail to remove a user to a new group when fetching the group fails and log an error', async (done) => {
      axiosClientFunctionMock = jest.fn();
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'FAIL' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({
        get: getClientFunctionMock,
        delete: axiosClientFunctionMock,
      }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      try {
        await duoService.removeUserFromGroup(duoUser, groupName);
      } catch (e) {
        // search for group
        expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
        expect(axiosClientFunctionMock).not.toHaveBeenCalled();
        done();
      }
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

      await duoService.addUserToGroup(duoUser, groupName, true);
      // search for group
      expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        ['/groups', `name=${groupName}`, duoHeaders], // // create new group
        [`/users/${duoUser.user_id}/groups`, formEncodedParams, duoHeaders],  // add user to group
      ]);
    });

    it('should throw error when adding a user to a non-existent group when jit is false', async () => {
      axiosClientFunctionMock = jest.fn();
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'OK' } }));
      const formEncodedParams = `group_id=${groupId}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      try {
        await duoService.addUserToGroup(duoUser, groupName, false);
        fail('should throw error');
      } catch (err) {
        // search for group
        expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
        // nothing to create
        expect(axiosClientFunctionMock).not.toHaveBeenCalled();
      }
    });

    it('should fail to add a user to a new group when fetching the group fails and log an error', async (done) => {
      axiosClientFunctionMock = jest.fn();
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'FAIL' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      try {
        await duoService.addUserToGroup(duoUser, groupName, true);
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
        return Promise.resolve({
          data: {
            stat: 'OK',
            response: [{ name: 'bar' }, { name: groupName, group_id: groupId }],
          },
        });
      });
      const formEncodedParams = `group_id=${groupId}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.addUserToGroup(duoUser, groupName, true);
      // search for groups using paging
      expect(getClientFunctionMock.mock.calls).toEqual([
        ['/groups?limit=100&offset=0', duoHeaders], // page 1
        ['/groups?limit=100&offset=100', duoHeaders],  // page 2
      ]);

      expect(axiosClientFunctionMock).toHaveBeenCalledWith(`/users/${duoUser.user_id}/groups`, formEncodedParams, duoHeaders);
    });
  });

  describe('#createGroup', () => {
    const groupName = 'createGroup';
    const groupId = '111';

    it('should create a new group without an alternateId', async () => {
      axiosClientFunctionMock = jest.fn((url) => {
        return Promise.resolve();
      });
      const formEncodedParams = `name=${groupName}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.createGroup(groupName);
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        ['/groups', `name=${groupName}`, duoHeaders], // // create new group
      ]);
    });

    it('should create a new group with an alternateId', async () => {
      const alternateId = '222';
      axiosClientFunctionMock = jest.fn((url) => {
        return Promise.resolve();
      });
      const formEncodedParams = `desc=${alternateId}&name=${groupName}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.createGroup(groupName, alternateId);
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        ['/groups', `desc=${alternateId}&name=${groupName}`, duoHeaders], // // create new group
      ]);
    });
  });

  describe('#renameGroup', () => {
    const alternateId = 'test';
    const groupId = 'baz';
    const groupName = 'new_group';

    it('should rename a group', async () => {
      axiosClientFunctionMock = jest.fn((url) => {
        if (url === '/groups') {
          return Promise.resolve({ data: { response: { group_id: groupId } } });
        }
        return Promise.resolve();
      });
      const getClientFunctionMock = jest.fn((url) => {
        return Promise.resolve({
          data: {
            stat: 'OK',
            response: [{ name: 'bar' }, { name: 'random', group_id: groupId, desc: alternateId }],
          },
        });
      });
      const formEncodedParams = `group_id=${groupId}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.renameGroup(alternateId, groupName);
      // search for group
      expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        [`/groups/${groupId}`, `name=${groupName}`, duoHeaders], // rename new group
      ]);
    });

    it('should fail to rename a group when fetching the group fails and log an error', async (done) => {
      axiosClientFunctionMock = jest.fn();
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'FAIL' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({ get: getClientFunctionMock, post: axiosClientFunctionMock }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      try {
        await duoService.renameGroup(alternateId, groupName);
      } catch (e) {
        // search for group
        expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
        expect(axiosClientFunctionMock).not.toHaveBeenCalled();
        done();
      }
    });
  });

  describe('#deleteGroup', () => {
    const alternateId = 'test';
    const groupId = 'baz';

    it('should delete a group', async () => {
      axiosClientFunctionMock = jest.fn((url) => {
        return Promise.resolve();
      });
      const getClientFunctionMock = jest.fn((url) => {
        return Promise.resolve({
          data: {
            stat: 'OK',
            response: [{ name: 'bar' }, { name: 'random', group_id: groupId, desc: alternateId }],
          },
        });
      });
      const formEncodedParams = `group_id=${groupId}`;
      // @ts-ignore
      axios.create = jest.fn(() => ({
        get: getClientFunctionMock,
        delete: axiosClientFunctionMock,
      }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      await duoService.deleteGroup(alternateId);
      // search for group
      expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        [`/groups/${groupId}`, duoHeaders], // rename new group
      ]);
    });

    it('should fail to delete a group when fetching the group fails and log an error', async (done) => {
      axiosClientFunctionMock = jest.fn();
      const getClientFunctionMock = jest.fn(() => Promise.resolve({ data: { stat: 'FAIL' } }));
      // @ts-ignore
      axios.create = jest.fn(() => ({
        get: getClientFunctionMock,
        delete: axiosClientFunctionMock,
      }));
      const duoService = new DuoUpdateRecipient(secretsServiceStub);

      try {
        await duoService.deleteGroup(alternateId);
      } catch (e) {
        // search for group
        expect(getClientFunctionMock).toHaveBeenCalledWith('/groups?limit=100&offset=0', duoHeaders);
        expect(axiosClientFunctionMock).not.toHaveBeenCalled();
        done();
      }
    });
  });
});
