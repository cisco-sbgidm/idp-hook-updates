import { AzureKeyVaultService } from '@idp-azure/AzureKeyVaultService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { HookEvent } from '@core/Hook';
import { Auth0Hooks } from '@common/Auth0Hooks';

/**
 * Entry point for the Azure function
 */
export const handler = async (context: any, req: any): Promise<any> => {
  // canonicalize hook event
  const hookEvent: HookEvent = {
    body: JSON.stringify(req.body),
    headers: req.headers,
    httpMethod: req.method,
  };
  console.log = context.log; // re-assign console.log to get log messages in Azure

  if (hookEvent.httpMethod === 'POST') {
    const secretService = new AzureKeyVaultService();
    await secretService.init();

    const auth0Hooks = new Auth0Hooks(
      secretService,
      new DuoUpdateRecipient(secretService));
    const res = await auth0Hooks.processEvent(hookEvent);
    return {
      status: res.statusCode,
      body: res.body,
    };
  }
  return {
    status: 500,
    body: `unhandled httpMethod ${hookEvent.httpMethod}`,
  };
};
