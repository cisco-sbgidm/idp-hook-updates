import { AwsSecretsService } from '@aws/AwsSecretsService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { HookEvent } from '@core/Hook';
import { Auth0Hooks } from '@common/Auth0Hooks';

/**
 * Entry point for the lambda function
 * @param event the hook event
 */
export const handler = async (event: HookEvent): Promise<any> => {
  if (event.httpMethod === 'POST') {
    const secretService = new AwsSecretsService();
    await secretService.init();

    const auth0Hooks = new Auth0Hooks(
      secretService,
      new DuoUpdateRecipient(secretService));
    return auth0Hooks.processEvent(event);
  }
  return {
    statusCode: 500,
    body: `unhandled httpMethod ${event.httpMethod}`,
  };
};
