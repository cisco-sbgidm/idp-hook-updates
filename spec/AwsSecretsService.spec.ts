import { AwsSecretsService } from '../src/AwsSecretsService';
import awsSdk from 'aws-sdk';

jest.mock('aws-sdk');

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
