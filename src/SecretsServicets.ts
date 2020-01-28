/**
 * Describes a service for managing secrets.
 */
export interface SecretsService {

  recipientAuthorizationSecret: string | undefined;
  initiatorApiKey: string | undefined;
  recipientIntegrationKey: string | undefined;
  recipientSignatureSecret: string | undefined;

  /**
   * Hook to init async services
   */
  init(): any;
}
