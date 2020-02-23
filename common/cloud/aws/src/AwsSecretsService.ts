import { SecretsService } from '@core/SecretsService';
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
  secretsManager: SecretsManager = new SecretsManager({
    region: process.env.AWS_REGION,
  });

  /**
   * Reads the secret values from AWS Secrets Manager.
   * Expects the secret value to contain the keys:
   * - apiKey
   * - authorization
   * - integrationKey
   * - signatureSecret
   */
  async init(): Promise<any> {
    if (!process.env.SM_SECRETS_ID) {
      throw new Error('SM_SECRETS_ID is not set');
    }
    const secrets = await this.secretsManager
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

  async createSecret(secretId: string, secret: string): Promise<any> {
    let secretFound = true;
    try {
      await this.secretsManager.getSecretValue({ SecretId: secretId }).promise();
    } catch (e) {
      secretFound = false;
    }
    if (secretFound) {
      console.debug(`Secret with id "${secretId}", already exists in AWS SM, updating it's value`);
      return this.secretsManager
        .updateSecret({ SecretId: secretId, SecretString: secret })
        .promise()
        .catch((errror) => {
          throw new Error(`can't update AWS SM Secret, error: ${errror}`);
        });
    }
    console.debug('Create secret');
    return await this.secretsManager
      .createSecret({ Name: secretId, SecretString: secret })
      .promise()
      .catch((errror) => {
        throw new Error(`can't create AWS SM Secret, error: ${errror}`);
      });
  }

}
