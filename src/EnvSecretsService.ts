import * as _ from 'lodash';
import { SecretsService } from './SecretsService';

/**
 * Implements SecretsService using environment variables.
 */
export class EnvSecretsService implements SecretsService {
  // these fields are undefined until the init() function promise is resolved
  recipientAuthorizationSecret: string | undefined;
  initiatorApiKey: string | undefined;
  recipientIntegrationKey: string | undefined;
  recipientSignatureSecret: string | undefined;

  /**
   * Reads the secret values from environment variables.
   */
  async init(): Promise<any> {
    this.initiatorApiKey = this.getEnv('INITIATOR_API_KEY');
    this.recipientAuthorizationSecret = this.getEnv('RECIPIENT_AUTHORIZATION_SECRET');
    this.recipientIntegrationKey = this.getEnv('RECIPIENT_INTEGRATION_KEY');
    this.recipientSignatureSecret = this.getEnv('SIGNATURE_SECRET');

    return;
  }

  private getEnv(name: string): string {
    if (!process.env[name] || _.isUndefined(process.env[name])) {
      throw new Error(`${name} is not set`);
    }
    return process.env[name]!;
  }

}
