import { AwsSecretsService } from './AwsSecretsService';
import { DuoUpdateRecipient } from './DuoUpdateRecipient';
import { HookEvent } from './Hook';
import { Auth0Hooks } from './Auth0Hooks';

/**
 * Entry point for the lambda function
 * @param event the hook event
 */
export const handler = async (event: HookEvent): Promise<any> => {
  console.log(event);
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
