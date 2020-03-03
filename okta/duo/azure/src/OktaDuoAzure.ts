import { AzureKeyVaultService } from '@idp-azure/AzureKeyVaultService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { OktaVerification } from '@common/OktaVerification';
import { HookEvent } from '@core/Hook';
import { OktaHooks } from '@common/OktaHooks';
import { RedisCacheDuplicateEventDetector } from '@core/RedisCacheDuplicateEventDetector';

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

  if (hookEvent.httpMethod === 'GET') {
    const oktaVerification = new OktaVerification();
    const res = await oktaVerification.verify(hookEvent);
    return {
      status: res.statusCode,
      body: res.body,
    };
  }
  if (hookEvent.httpMethod === 'POST') {
    const secretService = new AzureKeyVaultService();
    await secretService.init();

    const oktaHooks = new OktaHooks(
      secretService,
      new DuoUpdateRecipient(secretService),
      new RedisCacheDuplicateEventDetector());

    const res = await oktaHooks.processEvent(hookEvent);
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
