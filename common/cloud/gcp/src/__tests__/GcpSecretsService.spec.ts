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

it('should fail when process.env.GCP_PROJECT is not set', async () => {
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
    expect(e.message).toEqual('GCP_PROJECT is not set');
  } finally {
    process.env = OLD_ENV;
  }
});

describe('with SM_SECRETS_ID and GCP_PROJECT', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.SM_SECRETS_ID = 'some-secrets-id';
    process.env.GCP_PROJECT = 'some-project-id';
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
    process.env.GCP_PROJECT = 'some-project-id';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  const setupMock = (getSecretValueFn: any, deleteSecretFn: any, createSecretFn: any, addSecretVersionFn: any) => {
    // @ts-ignore
    SecretManagerServiceClient = jest.fn(() => ({
      getSecret: (name: any) => getSecretValueFn(),
      deleteSecret: (request: any) => deleteSecretFn(),
      createSecret: (request: any) => createSecretFn(),
      addSecretVersion: (request: any) => addSecretVersionFn(),
    }));
  };

  it('should fail when process.env.GCP_PROJECT is not set', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const deleteSecretFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));

    setupMock(getSecretValueFn, deleteSecretFn, createSecretFn, addSecretVersionFn);
    const service = new GcpSecretsService();
    try {
      process.env = {};
      // @ts-ignore
      SecretManagerServiceClient = jest.fn(() => ({
        accessSecretVersion: (name: any) => Promise.resolve([]),
      }));
      await service.createSecret(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('GCP_PROJECT is not set');
    }
  });

  it('should create secret if secret is not found', async () => {
    const getSecretValueFn = jest.fn(() => Promise.reject('error'));
    const deleteSecretFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, deleteSecretFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    await service.createSecret(secretId, secretString);
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).toHaveBeenCalled();
  });

  it('should throw an error if delete secret fails', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([{}]));
    const deleteSecretFn = jest.fn(() => Promise.reject('error'));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, deleteSecretFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    try {
      await service.createSecret(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('can\'t delete GCP SM secret, error: error');
    }
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(deleteSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).not.toHaveBeenCalled();
  });

  it('should throw an error if createSecret fails', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const deleteSecretFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.reject('error'));
    const addSecretVersionFn = jest.fn(() => Promise.resolve([{ name: secretVersion }]));
    setupMock(getSecretValueFn, deleteSecretFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    try {
      await service.createSecret(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('can\'t create GCP SM secret, error: error');
    }
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(createSecretFn).toHaveBeenCalled();
    expect(deleteSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).not.toHaveBeenCalled();
  });

  it('should throw an error if addSecretVersion fails', async () => {
    const getSecretValueFn = jest.fn(() => Promise.resolve([]));
    const deleteSecretFn = jest.fn(() => Promise.resolve([]));
    const createSecretFn = jest.fn(() => Promise.resolve([{ name: secretId }]));
    const addSecretVersionFn = jest.fn(() => Promise.reject('error'));
    setupMock(getSecretValueFn, deleteSecretFn, createSecretFn, addSecretVersionFn);

    const service = new GcpSecretsService();
    try {
      await service.createSecret(secretId, secretString);
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('can\'t create GCP SM secret version, error: error');
    }
    expect(getSecretValueFn).toHaveBeenCalled();
    expect(deleteSecretFn).toHaveBeenCalled();
    expect(createSecretFn).toHaveBeenCalled();
    expect(addSecretVersionFn).toHaveBeenCalled();
  });
});
