import { OktaHooks } from '@src/OktaHooks';
import { SecretsServiceStub } from '@core/stubs/SecretsServiceStub';
import { recipientUser, UpdateRecipientStub } from '@core/stubs/UpdateRecipientStub';
import { DuplicateEventDetectorStub } from '@core/stubs/DuplicateEventDetectorStub';
import { HookEvent } from '@core/Hook';

jest.mock('../OktaService');

const username = 'dummyUser';

let oktaHooks: OktaHooks;
let event: HookEvent;
let updateRecipient: UpdateRecipientStub;

beforeEach(() => {
  const secretsService = new SecretsServiceStub();
  updateRecipient = new UpdateRecipientStub();
  oktaHooks = new OktaHooks(
    secretsService,
    updateRecipient,
    new DuplicateEventDetectorStub(),
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
  const res = await oktaHooks.processEvent(event);
  expect(res).toEqual({
    statusCode: 500,
    body: 'Invalid Authorization',
  });
});

async function shouldCall(eventType: string,
                          updateRecipientFunction: string,
                          body: string = JSON.stringify({
                            data: {
                              events: [{
                                eventType,
                                uuid: '111',
                                target: [{ type: 'User', alternateId: username }],
                              }],
                            },
                          })) {
  // @ts-ignore
  const updateRecipientFunctionSpy = jest.spyOn(updateRecipient, updateRecipientFunction);
  const updateRecipientGetUserSpy = jest.spyOn(updateRecipient, 'getUser');
  event.body = body;
  const res = await oktaHooks.processEvent(event);
  expect(updateRecipientGetUserSpy).toHaveBeenCalledWith(username);
  expect(updateRecipientFunctionSpy).toHaveBeenCalled();
}

it('should process create user', async () => {
  await shouldCall('user.lifecycle.create', 'create');
});

it('should process delete user', async () => {
  await shouldCall('user.lifecycle.delete.initiated', 'delete');
});

it('should process suspend user', async () => {
  await shouldCall('user.lifecycle.suspend', 'disable');
});

it('should process unsuspend user', async () => {
  await shouldCall('user.lifecycle.unsuspend', 'reenable');
});

describe('deactivate', () => {
  let deactivateEvent: any;

  beforeEach(() => {
    deactivateEvent = {
      data: {
        events: [{
          eventType: 'user.mfa.factor.deactivate',
          uuid: '111',
          target: [{ type: 'User', alternateId: username }],
          outcome: { reason: 'RecipientUser reset MY_REASON factor' },
        }],
      },
    };
  });

  it('should process deactivate a user', async () => {
    await shouldCall('user.mfa.factor.deactivate', 'resetUser', JSON.stringify(deactivateEvent));
  });

  it('should throw error when deactivate reset outcome is empty ', async () => {
    deactivateEvent.data.events[0].outcome.reason = undefined;
    try {
      await shouldCall('user.mfa.factor.deactivate', 'resetUser', JSON.stringify(deactivateEvent));
      fail('should throw error');
    } catch (e) {
      expect(e.message).toContain('expected a reason in the MFA reset outcome');
    }
  });

  it('should throw error when deactivate reset reason is empty ', async () => {
    deactivateEvent.data.events[0].outcome.reason = 'wrong format';
    try {
      await shouldCall('user.mfa.factor.deactivate', 'resetUser', JSON.stringify(deactivateEvent));
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('expected a factor in the MFA reset reason "wrong format"');
    }
  });
});

describe('group membership', () => {
  const groupName = 'dummyGroup';

  it('should throw an error if the group info is not found', async () => {
    try {
      await shouldCall('group.user_membership.add', 'addUserToGroup');
      fail('should throw error');
    } catch (e) {
      expect(e.message).toContain('Unable to find target user-group in event target');
    }
  });

  it('should add a user to a group', async () => {
    const groupEvent = {
      data: {
        events: [{
          eventType: 'group.user_membership.add',
          uuid: '111',
          target: [{ type: 'User', alternateId: username }, {
            type: 'UserGroup',
            displayName: groupName,
          }],
        }],
      },
    };
    await shouldCall('group.user_membership.add', 'addUserToGroup', JSON.stringify(groupEvent));
  });

  it('should remove a user from a group', async () => {
    const groupEvent = {
      data: {
        events: [{
          eventType: 'group.user_membership.remove',
          uuid: '111',
          target: [{ type: 'User', alternateId: username }, {
            type: 'UserGroup',
            displayName: groupName,
          }],
        }],
      },
    };
    await shouldCall('group.user_membership.remove', 'removeUserFromGroup', JSON.stringify(groupEvent));
  });
});

it('should update a user profile', async () => {
  const userId = '000userid111';
  const oktaUserProfile = {
    email: 'test@test.com',
    firstName: 'first',
    lastName: 'last',
    middleName: 'middle',
  };

  const updateProfileEvent = {
    data: {
      events: [{
        eventType: 'user.account.update_profile',
        uuid: '111',
        target: [{ type: 'User', alternateId: username }],
      }],
    },
    debugContext: { debugData: { requestUri: `/api/v1/users/${userId}` } },
  };

  const updateRecipientUpdateProfileSpy = jest.spyOn(updateRecipient, 'updateProfile');
  event.body = JSON.stringify(updateProfileEvent);
  await oktaHooks.processEvent(event);
  expect(updateRecipientUpdateProfileSpy).toHaveBeenCalledWith(recipientUser, {
    email: oktaUserProfile.email,
    firstname: oktaUserProfile.firstName,
    lastname: oktaUserProfile.lastName,
    middlename: oktaUserProfile.middleName,
  });
});

it('should throw an error when the event does not have a target user', async () => {
  event.body = JSON.stringify({
    data: {
      events: [{ uuid: '111', eventType: 'user.account.update_profile', target: [] }],
    },
  });

  try {
    await oktaHooks.processEvent(event);
    fail('should throw error');
  } catch (e) {
    expect(e.message).toContain('Unable to find target user in event target');
  }
});
