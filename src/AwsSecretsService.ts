import { SecretsService } from './SecretsService';
import { SecretsManager } from 'aws-sdk';

/**
 * Implements SecretsService using AWS Secrets Manager.
 */
export class AwsSecretsService implements SecretsService {
  // these fields are undefined until the init() function promise is resolved
  recipientAuthorizationSecret: string | undefined;
  initiatorApiKey: string | undefined;
  recipientIntegrationKey: string | undefined;
  recipientSignatureSecret: string | undefined;

  /**
   * Reads the secret values from AWS Secrets Manager.
   * Expects the secret value to contain the keys:
   * - apiKey
   * - authorization
   * - integrationKey
   * - signatureSecret
   */
  async init(): Promise<any> {
    const client = new SecretsManager({
      region: process.env.AWS_REGION,
    });
    if (!process.env.SM_SECRETS_ID) {
      throw new Error('SM_SECRETS_ID is not set');
    }
    const secrets = await client
      .getSecretValue({ SecretId: process.env.SM_SECRETS_ID })
      .promise()
      .then((response) => {
        if (!response.SecretString) {
          throw new Error('expected to find SecretString');
        }
        return JSON.parse(response.SecretString);
      });

    this.initiatorApiKey = secrets.apiKey;
    this.recipientAuthorizationSecret = secrets.authorization;
    this.recipientIntegrationKey = secrets.integrationKey;
    this.recipientSignatureSecret = secrets.signatureSecret;

    return;
  }

}
