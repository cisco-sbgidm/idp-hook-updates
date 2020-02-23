import { Auth0Event, Auth0Hooks } from '@src/Auth0Hooks';
import { SecretsServiceStub } from '@core/stubs/SecretsServiceStub';
import { recipientUser, UpdateRecipientStub } from '@core/stubs/UpdateRecipientStub';
import { HookEvent } from '@core/Hook';
import SpyInstance = jest.SpyInstance;

const userId = 'auth0|5e4906e3accd890e6814a9e7';
const uriEncodedUserId = encodeURIComponent(userId);

let auth0Hooks: Auth0Hooks;
let event: HookEvent;
let updateRecipient: UpdateRecipientStub;

beforeEach(() => {
  const secretsService = new SecretsServiceStub();
  updateRecipient = new UpdateRecipientStub();
  auth0Hooks = new Auth0Hooks(
    secretsService,
    updateRecipient,
  );

  event = {
    body: '',
    headers: {
      Authorization: secretsService.recipientAuthorizationSecret,
    },
    httpMethod: '',
  };

});

it('should throw error if authorization fails', async () => {
  event.headers.Authorization = 'dummy';
  const res = await auth0Hooks.processEvent(event);
  expect(res).toEqual({
    statusCode: 500,
    body: 'Invalid Authorization',
  });
});

async function shouldCall(updateRecipientFunction: string,
                          auth0Event: Auth0Event,
                          shouldGetUser = true,
                          shouldUpdateRecipient = true): Promise<SpyInstance> {
  // @ts-ignore
  const updateRecipientFunctionSpy = jest.spyOn(updateRecipient, updateRecipientFunction);
  const updateRecipientGetUserSpy = jest.spyOn(updateRecipient, 'getUser');
  event.body = JSON.stringify([auth0Event]);
  const res = await auth0Hooks.processEvent(event);
  if (shouldGetUser) {
    expect(updateRecipientGetUserSpy).toHaveBeenCalledWith(userId);
  } else {
    expect(updateRecipientGetUserSpy).not.toHaveBeenCalledWith(userId);
  }
  if (shouldUpdateRecipient) {
    expect(updateRecipientFunctionSpy).toHaveBeenCalled();
  } else {
    expect(updateRecipientFunctionSpy).not.toHaveBeenCalled();
  }
  return Promise.resolve(updateRecipientFunctionSpy);
}

it('should process create user', async () => {
  await shouldCall(
    'create',
    {
      request: { method: 'post', path: '/api/v2/users', body: undefined },
      response: { statusCode: 201, body: { email: 'test@test.com', name: 'test@test.com' } },
    },
    false);
});

it('should skip processing an event if the status code is not success', async () => {
  // status code less than 200, cover all branches
  await shouldCall(
    'create',
    {
      request: { method: 'post', path: '/api/v2/users', body: undefined },
      response: { statusCode: 100, body: { email: 'test@test.com', name: 'test@test.com' } },
    },
    false,
    false);

  // status code greater than 200, cover all branches
  await shouldCall(
    'create',
    {
      request: { method: 'post', path: '/api/v2/users', body: undefined },
      response: { statusCode: 400, body: { email: 'test@test.com', name: 'test@test.com' } },
    },
    false,
    false);
});

it('should process delete user', async () => {
  await shouldCall(
    'delete',
    {
      request: { method: 'delete', path: `/api/v2/users/${uriEncodedUserId}`, body: undefined },
      response: { statusCode: 204, body: { email: 'test@test.com', name: 'test@test.com' } },
    });
});

describe('update a user profile', () => {
  const newemail = 'newemail@test.com';

  it('should update the email', async () => {
    const updateRecipientUpdateProfileSpy = jest.spyOn(updateRecipient, 'updateProfile');
    const updateProfileEvent = {
      request: {
        method: 'patch',
        path: `/api/v2/users/${uriEncodedUserId}`,
        body: { email: newemail },
      },
      response: { statusCode: 200, body: undefined },
    };
    event.body = JSON.stringify([updateProfileEvent]);
    await auth0Hooks.processEvent(event);
    expect(updateRecipientUpdateProfileSpy).toHaveBeenCalledWith(recipientUser, {
      email: newemail,
    });
  });

  it('should update the name', async () => {
    const updateRecipientUpdateProfileSpy = jest.spyOn(updateRecipient, 'updateProfile');
    const updateProfileEvent = {
      request: {
        method: 'patch',
        path: `/api/v2/users/${uriEncodedUserId}`,
        body: { name: 'One Two Three' },
      },
      response: { statusCode: 200, body: undefined },
    };
    event.body = JSON.stringify([updateProfileEvent]);
    await auth0Hooks.processEvent(event);
    expect(updateRecipientUpdateProfileSpy).toHaveBeenCalledWith(recipientUser, {
      firstname: 'One',
      lastname: 'Two Three',
    });
  });

  it.each(
    [
      ['disable', 'true'],
      ['reenable', 'false'],
    ],
  )('should %s the user', async (method: string, blocked: string) => {
    // @ts-ignore
    const updateRecipientUpdateProfileSpy = jest.spyOn(updateRecipient, method);
    const updateProfileEvent = {
      request: {
        method: 'patch',
        path: `/api/v2/users/${uriEncodedUserId}`,
        body: { blocked: JSON.parse(blocked) },
      },
      response: { statusCode: 200, body: undefined },
    };
    event.body = JSON.stringify([updateProfileEvent]);
    await auth0Hooks.processEvent(event);
    expect(updateRecipientUpdateProfileSpy).toHaveBeenCalledWith(recipientUser);
  });

  it('should not update the user if the name and email are not changed', async () => {
    const updateRecipientUpdateProfileSpy = jest.spyOn(updateRecipient, 'updateProfile');
    const updateProfileEvent = {
      request: { method: 'patch', path: `/api/v2/users/${uriEncodedUserId}`, body: { key: 'val' } },
      response: { statusCode: 200, body: undefined },
    };
    event.body = JSON.stringify([updateProfileEvent]);
    await auth0Hooks.processEvent(event);
    expect(updateRecipientUpdateProfileSpy).not.toHaveBeenCalled();
  });
});

describe('Role operations', () => {
  const roleName = 'testRole';
  const roleId = 'kjhsd34gGG';

  async function shouldCallForRole(updateRecipientFunction: string,
                                   auth0Event: Auth0Event) {
    // @ts-ignore
    const updateRecipientFunctionSpy = jest.spyOn(updateRecipient, updateRecipientFunction);
    event.body = JSON.stringify([auth0Event]);
    const res = await auth0Hooks.processEvent(event);
    expect(res).toEqual({ statusCode: 200 });
    expect(updateRecipientFunctionSpy).toHaveBeenCalled();
  }

  it('should create a new role', async () => {
    await shouldCallForRole(
      'createGroup',
      {
        request: { method: 'post', path: '/api/v2/roles', body: undefined },
        response: { statusCode: 204, body: { id: roleId, name: roleName } },
      });
  });

  it('should rename a role', async () => {
    await shouldCallForRole(
      'renameGroup',
      {
        request: { method: 'patch', path: `/api/v2/roles/${roleId}`, body: undefined },
        response: { statusCode: 204, body: { name: roleName, id: roleId } },
      });
  });

  it('should delete a role', async () => {
    await shouldCallForRole(
      'deleteGroup',
      {
        request: { method: 'delete', path: `/api/v2/roles/${roleId}`, body: undefined },
        response: { statusCode: 204, body: undefined },
      });
  });

  it('should create a new role after first event fails', async () => {
    // @ts-ignore
    const renameGroupSpy = jest.spyOn(updateRecipient, 'renameGroup').mockRejectedValue('fail');
    const createGroupSpy = jest.spyOn(updateRecipient, 'createGroup');
    event.body = JSON.stringify([
      {
        request: { method: 'patch', path: `/api/v2/roles/${roleId}`, body: undefined },
        response: { statusCode: 204, body: { name: roleName, id: roleId } },
      },
      {
        request: { method: 'post', path: '/api/v2/roles', body: undefined },
        response: { statusCode: 204, body: { id: roleId, name: roleName } },
      },
    ]);
    const res = await auth0Hooks.processEvent(event);
    expect(res).toEqual({ statusCode: 200 });
    expect(renameGroupSpy).toHaveBeenCalled();
    expect(createGroupSpy).toHaveBeenCalled();
  });

});

describe('group membership', () => {
  const groupName = 'dummyGroup';

  it('should add a user to a group', async () => {
    const recipientFunctionSpy = await shouldCall(
      'addUserToGroup',
      {
        request: {
          method: 'post',
          path: `/api/v2/users/${uriEncodedUserId}/roles`,
          body: { roles: ['role1', 'role2'] },
        },
        response: { statusCode: 204, body: undefined },
      });
    expect(recipientFunctionSpy.mock.calls).toEqual([
      [recipientUser, 'role1', false],
      [recipientUser, 'role2', false],
    ]);
  });

  it('should remove a user from a group', async () => {
    const recipientFunctionSpy = await shouldCall(
      'removeUserFromGroup',
      {
        request: {
          method: 'delete',
          path: `/api/v2/users/${uriEncodedUserId}/roles`,
          body: { roles: ['role1', 'role2'] },
        },
        response: { statusCode: 204, body: undefined },
      });
    expect(recipientFunctionSpy.mock.calls).toEqual([
      [recipientUser, 'role1'],
      [recipientUser, 'role2'],
    ]);
  });
});
