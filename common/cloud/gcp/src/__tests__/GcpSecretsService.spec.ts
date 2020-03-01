import { GcpSecretsService } from '../GcpSecretsService';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

it('should fail when process.env.SM_SECRETS_ID is not set', async () => {
  // @ts-ignore
  SecretManagerServiceClient = jest.fn(() => ({
    accessSecretVersion: (name: any) => Promise.resolve([]),
  }));
  const service = new GcpSecretsService();
  try {
    await service.init();
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('SM_SECRETS_ID is not set');
  }
});

it('should fail when process.env.PROJECT_ID is not set', async () => {
  const service = new GcpSecretsService();
  const OLD_ENV = process.env;
  try {
    process.env = { ...OLD_ENV };
    process.env.SM_SECRETS_ID = 'some-secrets-id';
    // @ts-ignore
    SecretManagerServiceClient = jest.fn(() => ({
      accessSecretVersion: (name: any) => Promise.resolve([]),
    }));
    await service.init();
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('PROJECT_ID is not set');
  } finally {
    process.env = OLD_ENV;
  }
});

describe('with SM_SECRETS_ID and PROJECT_ID', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.SM_SECRETS_ID = 'some-secrets-id';
    process.env.PROJECT_ID = 'some-project-id';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should throw an error if the secret is not found', async () => {
    // @ts-ignore
    SecretManagerServiceClient = jest.fn(() => ({
      accessSecretVersion: (name: any) => Promise.resolve([]),
    }));
    const service = new GcpSecretsService();
    try {
      await service.init();
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('expected to find secret payload.data');
    }
  });

  it('should parse the secrets correctly', async () => {
    const secrets = {
      apiKey: 'apiKeyValue',
      authorization: 'authorizationValue',
      integrationKey: 'integrationKeyValue',
      signatureSecret: 'signatureSecretValue',
    };
    const getSecretValueFn = jest.fn(() => Promise.resolve([{
      payload: {
        data: JSON.stringify(secrets),
      }}],
    ));
    // @ts-ignore
    SecretManagerServiceClient = jest.fn(() => ({
      accessSecretVersion: (name: any) => getSecretValueFn(),
    }));
    const service = new GcpSecretsService();
    await service.init();
    expect(service.initiatorApiKey).toEqual(secrets.apiKey);
    expect(service.recipientAuthorizationSecret).toEqual(secrets.authorization);
    expect(service.recipientIntegrationKey).toEqual(secrets.integrationKey);
    expect(service.recipientSignatureSecret).toEqual(secrets.signatureSecret);
    expect(getSecretValueFn).toHaveBeenCalled();
  });
});

describe('#createSecret', () => {
  const secretId = 'secretId';
  const secretString = 'secretString';
  const secretVersion = '1';
  const nextSecretVersion = '2';
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.PROJECT_ID = 'some-project-id';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  const setupMock = (getSecretValueFn: any, createSecretFn: any, addSecretVersionFn: any) => {
    // @ts-ignore
    SecretManagerServiceClient = jest.fn(() => ({
      accessSecretVersion: (name: any) => getSecretValueFn(),
      createSecret: (request: any) => createSecretFn(),
      addSecretVersion: (request: any) => addSecretVersionFn(),
    }));
  };

  it('should fail when process.env.PROJECT_ID is not set', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, createSecretFn, addSecretVersionFn);
    const service = new GcpSecretsService();
    try {
      process.env = {};
      // @ts-ignore
      SecretManagerServiceClient = jest.fn(() => ({
        accessSecretVersion: (name: any) => Promise.resolve([]),
      }));
      await service.createSecretVersion(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('PROJECT_ID is not set');
    }
  });

  it('should create secret if secret is not found', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    await service.createSecretVersion(secretId, secretString);
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).toHaveBeenCalled();
  });

  it('should throw an error if accessSecretVersion fails', async () => {
    const getSecretValueFn = jest.fn(() => Promise.reject('error'));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    try {
      await service.createSecretVersion(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('can\'t access GCP SM secret, error: error');
    }
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).not.toHaveBeenCalled();
    expect(addSecretVersionFn).not.toHaveBeenCalled();
  });

  it('should throw an error if createSecret fails', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.reject('error'));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    try {
      await service.createSecretVersion(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('can\'t create GCP SM secret, error: error');
    }
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).not.toHaveBeenCalled();
  });

  it('should throw an error if addSecretVersion fails', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.reject('error'));
    setupMock(getSecretValueFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    try {
      await service.createSecretVersion(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('can\'t create GCP SM secret version, error: error');
    }
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).toHaveBeenCalled();
  });

  it('should update secret if secret is found', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([{ payload: { data: {} } }]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: nextSecretVersion }]));
    setupMock(getSecretValueFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    await service.createSecretVersion(secretId, secretString);
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).not.toHaveBeenCalled();
    expect(addSecretVersionFn).toHaveBeenCalled();
  });
});
