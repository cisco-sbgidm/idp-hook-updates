import { AwsSecretsService } from '../AwsSecretsService';
import awsSdk from 'aws-sdk';
import {OktaService} from '../OktaService';

jest.mock('aws-sdk');

it('should fail when process.env.SM_SECRETS_ID is not set', async () => {
  const service = new AwsSecretsService();
  try {
    await service.init();
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('SM_SECRETS_ID is not set');
  }
});

describe('with SM_SECRETS_ID', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.resetModules(); // this is important - it clears the cache
    process.env = { ...OLD_ENV };
    process.env.SM_SECRETS_ID = 'some-secret-id';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should throw an error if not the secret is not found', async () => {
    // @ts-ignore
    awsSdk.SecretsManager = jest.fn(() => ({
      getSecretValue: () => ({
        promise: jest.fn(() => Promise.resolve({})),
      }),
    }));

    const service = new AwsSecretsService();
    try {
      await service.init();
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual('expected to find SecretString');
    }
  });

  it('should parse the secrets correctly', async () => {
    const secrets = {
      apiKey: 'apiKeyValue',
      authorization: 'authorizationValue',
      integrationKey: 'integrationKeyValue',
      signatureSecret: 'signatureSecretValue',
    };
    // @ts-ignore
    awsSdk.SecretsManager = jest.fn(() => ({
      getSecretValue: () => ({
        promise: jest.fn(() => Promise.resolve({
          SecretString: JSON.stringify(secrets),
        })),
      }),
    }));

    const service = new AwsSecretsService();
    await service.init();
    expect(service.initiatorApiKey).toEqual(secrets.apiKey);
    expect(service.recipientAuthorizationSecret).toEqual(secrets.authorization);
    expect(service.recipientIntegrationKey).toEqual(secrets.integrationKey);
    expect(service.recipientSignatureSecret).toEqual(secrets.signatureSecret);
  });
});
