import { SecretsService } from '@core/SecretsService';
import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import * as _ from 'lodash';

/**
 * Implements SecretsService using GCP Secrets Manager.
 */
export class GcpSecretsService implements SecretsService {
  // these fields are undefined until the init() function promise is resolved
  recipientAuthorizationSecret: string | undefined;
  initiatorApiKey: string | undefined;
  recipientIntegrationKey: string | undefined;
  recipientSignatureSecret: string | undefined;

  private readonly secretsManager = new SecretManagerServiceClient();
  /**
   * Reads the secret values from GCP Secrets Manager.
   * Expects the secret value to contain the keys:
   * - apiKey
   * - authorization
   * - integrationKey
   * - signatureSecret
   */
  async init(): Promise<any> {
    const secretId = process.env.SM_SECRETS_ID;
    if (!secretId) {
      throw new Error('SM_SECRETS_ID is not set');
    }
    // Access the secret.
    const [accessResponse] = await this.secretsManager.accessSecretVersion({
      name: this.getLatestVersionName(secretId, this.getProjectId()),
    });
    const responsePayload = _.get(accessResponse, 'payload.data');
    if (!responsePayload) {
      throw new Error('expected to find secret payload.data');
    }
    const secrets = JSON.parse(responsePayload.toString());

    this.initiatorApiKey = secrets.apiKey;
    this.recipientAuthorizationSecret = secrets.authorization;
    this.recipientIntegrationKey = secrets.integrationKey;
    this.recipientSignatureSecret = secrets.signatureSecret;
  }

  async createSecret(secretId: string, payload: string) : Promise<any> {
    let secretFound = true;
    const projectId = this.getProjectId();
    // Access the secret.
    await this.secretsManager.getSecret({
      name: this.getSecretName(secretId, projectId),
    })
    .catch((error) => {
      secretFound = false;
    });
    if (secretFound) {
      console.debug(`Secret with id "${secretId}", already exists in GCP SM, updating it`);
      await this.secretsManager.deleteSecret({
        name: this.getSecretName(secretId, projectId),
      })
      .catch((error) => {
        throw new Error(`can't delete GCP SM secret, error: ${JSON.stringify(error)}`);
      });
    }
    // Create the secret with automation replication.
    const [secret] = await this.secretsManager.createSecret({
      secretId,
      parent: this.getSecretParent(projectId),
      secret: {
        name: secretId,
        replication: {
          automatic: {},
        },
      },
    })
    .catch((error) => {
      throw new Error(`can't create GCP SM secret, error: ${JSON.stringify(error)}`);
    });
    console.info(`Created secret ${secret.name}`);
    // Add a version with a payload onto the secret.
    const [version] = await this.secretsManager.addSecretVersion({
      parent: this.getSecretName(secretId, projectId),
      payload: {
        data: Buffer.from(payload, 'utf8'),
      },
    })
    .catch((error) => {
      throw new Error(`can't create GCP SM secret version, error: ${JSON.stringify(error)}`);
    });
    console.info(`Added secret version ${version.name}`);
  }

  private getSecretName(secretId: string, projectId: string) : string {
    return `projects/${projectId}/secrets/${secretId}`;
  }

  private getLatestVersionName(secretId: string, projectId: string) : string {
    const secretName = this.getSecretName(secretId, projectId);
    return `${secretName}/versions/latest`;
  }

  private getSecretParent(projectId: string) {
    return `projects/${projectId}`;
  }

  private getProjectId() : string {
    // projectID is set from the GCP_PROJECT environment variable, which is
    // automatically set by the Cloud Functions runtime.
    if (!process.env.GCP_PROJECT) {
      throw new Error('GCP_PROJECT is not set');
    }
    return process.env.GCP_PROJECT;
  }
}
