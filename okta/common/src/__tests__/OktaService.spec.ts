import { OktaService } from '../OktaService';
import { SecretsServiceStub } from '@core/stubs/SecretsServiceStub';
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
  const eventHookId = 'eventHookId';
  const eventHookName = 'eventHookName';
  const eventHookEndpoint = 'eventHookEndpoint';

  const eventHook = {
    name: eventHookName,
    events: {
      type: 'EVENT_TYPE',
      items: [
        'user.lifecycle.create',
        'user.lifecycle.delete.initiated',
        'user.lifecycle.suspend',
        'user.lifecycle.unsuspend',
        'user.account.update_profile',
        'group.user_membership.add',
        'group.user_membership.remove',
        'user.mfa.factor.deactivate',
      ],
    },
    channel: {
      type: 'HTTP',
      version: '1.0.0',
      config: {
        uri: eventHookEndpoint,
        authScheme: {
          type: 'HEADER',
          key: 'Authorization',
          value: secretsServiceStub.recipientSignatureSecret,
        },
      },
    },
  };

  let getFn: any;
  let deleteFn: any;
  let postFn: any;
  let errorMessages: string[];

  const axiosError = {
    response: {
      data: 'data',
      status: 500,
      headers: ['foo', 'bar'],
    },
  };

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

  it('should return event hooks from Okta', async () => {
    const eventHooks = [
      {
        id: 'id1',
        name: 'name1',
        status: 'ACTIVE',
      },
      {
        id: 'id2',
        name: 'name2',
        status: 'ACTIVE',
      },
    ];
    getFn = jest.fn(() => Promise.resolve({ data: eventHooks }));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      get: getFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const retrieveEventHooks = await oktaService.getEventHooks();
    expect(retrieveEventHooks).toEqual(eventHooks);
    expect(getFn).toHaveBeenCalledWith('/eventHooks', { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
  });

  it('should log and throw error when the call for get event hooks fails', async (done) => {
    getFn = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      get: getFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const eventHooks = await oktaService.getEventHooks()
      .catch((err) => {
        expect(getFn).toHaveBeenCalledWith('/eventHooks', { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
        expect(errorMessages).toEqual([
          axiosError.response.data,
          axiosError.response.status,
          axiosError.response.headers,
        ]);
        done();
      });
  });

  it('should delete event hook from Okta', async () => {
    deleteFn = jest.fn(() => Promise.resolve({}));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      delete: deleteFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    await oktaService.deleteEventHook(eventHookId);
    expect(deleteFn).toHaveBeenCalledWith(`/eventHooks/${eventHookId}`, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
  });

  it('should log and throw error when the call for delete event hook fails', async (done) => {
    deleteFn = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      delete: deleteFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const eventHooks = await oktaService.deleteEventHook(eventHookId)
      .catch((err) => {
        expect(deleteFn).toHaveBeenCalledWith(`/eventHooks/${eventHookId}`, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
        expect(errorMessages).toEqual([
          axiosError.response.data,
          axiosError.response.status,
          axiosError.response.headers,
        ]);
        done();
      });
  });

  it('should deactivate event hook in Okta', async () => {
    postFn = jest.fn(() => Promise.resolve({}));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      post: postFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    await oktaService.deactivateEventHook(eventHookId);
    expect(postFn).toHaveBeenCalledWith(`/eventHooks/${eventHookId}/lifecycle/deactivate`, null, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
  });

  it('should log and throw error when the call for deactivate event hook fails', async (done) => {
    postFn = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      post: postFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const eventHooks = await oktaService.deactivateEventHook(eventHookId)
      .catch((err) => {
        expect(postFn).toHaveBeenCalledWith(`/eventHooks/${eventHookId}/lifecycle/deactivate`, null, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
        expect(errorMessages).toEqual([
          axiosError.response.data,
          axiosError.response.status,
          axiosError.response.headers,
        ]);
        done();
      });
  });

  it('should verify event hook in Okta', async () => {
    postFn = jest.fn(() => Promise.resolve({}));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      post: postFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    await oktaService.verifyEventHook(eventHookId);
    expect(postFn).toHaveBeenCalledWith(`/eventHooks/${eventHookId}/lifecycle/verify`, null, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
  });

  it('should log and throw error when the call for verify event hook fails', async (done) => {
    postFn = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      post: postFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const eventHooks = await oktaService.verifyEventHook(eventHookId)
      .catch((err) => {
        expect(postFn).toHaveBeenCalledWith(`/eventHooks/${eventHookId}/lifecycle/verify`, null, { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}` } });
        expect(errorMessages).toEqual([
          axiosError.response.data,
          axiosError.response.status,
          axiosError.response.headers,
        ]);
        done();
      });
  });

  it('should create event hook in Okta', async () => {
    postFn = jest.fn(() => Promise.resolve({}));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      post: postFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    await oktaService.createEventHook(eventHookName, eventHookEndpoint);
    expect(postFn).toHaveBeenCalledWith('/eventHooks', eventHook,
                                        { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}`, 'Content-Type': 'application/json' } });
  });

  it('should log and throw error when the call for create event hook fails', async (done) => {
    postFn = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({
      post: postFn,
    }));
    const oktaService = new OktaService(secretsServiceStub);
    const eventHooks = await oktaService.createEventHook(eventHookName, eventHookEndpoint)
      .catch((err) => {
        expect(postFn).toHaveBeenCalledWith('/eventHooks', eventHook,
                                            { headers: { Authorization: `SSWS ${secretsServiceStub.initiatorApiKey}`, 'Content-Type': 'application/json' } });
        expect(errorMessages).toEqual([
          axiosError.response.data,
          axiosError.response.status,
          axiosError.response.headers,
        ]);
        done();
      });
  });

  it('should setup event hook in Okta, when hook does not exist', async () => {
    const oktaService = new OktaService(secretsServiceStub);
    const getEventHooksFn = jest.fn(() => Promise.resolve({}));
    const createEventHookFn = jest.fn(() => Promise.resolve({ id: eventHookId }));
    const verifyEventHookFn = jest.fn(() => Promise.resolve({}));
    oktaService.getEventHooks = getEventHooksFn;
    oktaService.createEventHook = createEventHookFn;
    oktaService.verifyEventHook = verifyEventHookFn;
    await oktaService.setupEventHook(eventHookName, eventHookEndpoint);
    expect(getEventHooksFn).toHaveBeenCalled();
    expect(createEventHookFn).toHaveBeenCalledWith(eventHookName, eventHookEndpoint);
    expect(verifyEventHookFn).toHaveBeenCalledWith(eventHookId);
  });

  it('should setup event hook in Okta, when hook already exists', async () => {
    const oktaService = new OktaService(secretsServiceStub);
    const getEventHooksFn = jest.fn(() => Promise.resolve([{ name: eventHookName, id: eventHookId }]));
    const deactivateEventHookFn = jest.fn(() => Promise.resolve({}));
    const deleteEventHookFn = jest.fn(() => Promise.resolve({}));
    const createEventHookFn = jest.fn(() => Promise.resolve({ id: eventHookId }));
    const verifyEventHookFn = jest.fn(() => Promise.resolve({}));
    oktaService.getEventHooks = getEventHooksFn;
    oktaService.deactivateEventHook = deactivateEventHookFn;
    oktaService.deleteEventHook = deleteEventHookFn;
    oktaService.createEventHook = createEventHookFn;
    oktaService.verifyEventHook = verifyEventHookFn;
    await oktaService.setupEventHook(eventHookName, eventHookEndpoint);
    expect(getEventHooksFn).toHaveBeenCalled();
    expect(deactivateEventHookFn).toHaveBeenCalledWith(eventHookId);
    expect(deleteEventHookFn).toHaveBeenCalledWith(eventHookId);
    expect(createEventHookFn).toHaveBeenCalledWith(eventHookName, eventHookEndpoint);
    expect(verifyEventHookFn).toHaveBeenCalledWith(eventHookId);
  });
});
