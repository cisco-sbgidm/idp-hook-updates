import { AzureKeyVaultService } from '../AzureKeyVaultService';

const getSecretFn = jest.fn(key => ({ value: key }));
const setSecretFn = jest.fn();

jest.mock('@azure/keyvault-secrets', () => ({
  SecretClient: jest.fn(() => ({
    getSecret: getSecretFn,
    setSecret: setSecretFn,
  })),
}));


it('should fail when process.env.KEY_VAULT_NAME is not set', async () => {
  try {
    new AzureKeyVaultService();
    fail('should throw error');
  } catch (e) {
    expect(e.message).toEqual('KEY_VAULT_NAME is not set');
  }
});

describe('with KEY_VAULT_NAME', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    process.env = { ...OLD_ENV };
    process.env.KEY_VAULT_NAME = 'some-name';
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it('should parse the secrets correctly', async () => {
    const service = new AzureKeyVaultService();
    await service.init();
    expect(service.initiatorApiKey).toEqual('apiKey');
    expect(service.recipientAuthorizationSecret).toEqual('authorization');
    expect(service.recipientIntegrationKey).toEqual('integrationKey');
    expect(service.recipientSignatureSecret).toEqual('signatureSecret');
  });

  describe('#createSecret', () => {
    it('should create secret', async () => {
      const secretName = 'foo';
      const secretValue = 'bar';
      const service = new AzureKeyVaultService();
      await service.init();
      await service.createSecret(secretName, secretValue);
      expect(setSecretFn).toHaveBeenCalledWith(secretName, secretValue);
    });
  });
});
