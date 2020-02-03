import { SecretsService } from '../SecretsService';

export class SecretsServiceStub implements SecretsService {

  recipientAuthorizationSecret: string;
  initiatorApiKey: string;
  recipientIntegrationKey: string;
  recipientSignatureSecret: string;

  constructor() {
    this.initiatorApiKey = 'apikey';
    this.recipientAuthorizationSecret = 'authzsecret';
    this.recipientIntegrationKey = 'intgkey';
    this.recipientSignatureSecret = 'signsecret';
  }

  init(): any {
  }
}
