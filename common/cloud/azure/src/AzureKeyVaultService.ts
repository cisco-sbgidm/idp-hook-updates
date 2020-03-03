import { SecretsService } from '@core/SecretsService';
import { DefaultAzureCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

/**
 * Implements SecretsService using Azure Key Vault.
 */
export class AzureKeyVaultService implements SecretsService {
  // these fields are undefined until the init() function promise is resolved
  recipientAuthorizationSecret: string | undefined;
  initiatorApiKey: string | undefined;
  recipientIntegrationKey: string | undefined;
  recipientSignatureSecret: string | undefined;
  private client: SecretClient;

  constructor() {
    if (!process.env.KEY_VAULT_NAME) {
      throw new Error('KEY_VAULT_NAME is not set');
    }
    const credential = new DefaultAzureCredential();

    const url = `https://${process.env.KEY_VAULT_NAME}.vault.azure.net`;

    this.client = new SecretClient(url, credential);
  }

  /**
   * Reads the secret values from Azure Key Vault.
   * Expects the secret value to contain the keys:
   * - apiKey
   * - authorization
   * - integrationKey
   * - signatureSecret
   */
  async init(): Promise<any> {
    this.initiatorApiKey = (await this.client.getSecret('apiKey')).value;
    this.recipientAuthorizationSecret = (await this.client.getSecret('authorization')).value;
    this.recipientIntegrationKey = (await this.client.getSecret('integrationKey')).value;
    this.recipientSignatureSecret = (await this.client.getSecret('signatureSecret')).value;
  }

  async createSecret(secretName: string, secretValue: string): Promise<any> {
    return this.client.setSecret(secretName, secretValue);
  }
}
