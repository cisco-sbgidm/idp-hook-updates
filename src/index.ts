import { AwsSecretsService } from './AwsSecretsService';
import { DuoUpdateRecipient } from './DuoUpdateRecipient';
import { OktaVerification } from './OktaVerification';
import { HookEvent } from './Hook';
import { OktaHooks } from './OktaHooks';
import { AwsDynamoDbDuplicateEventDetector } from './AwsDynamoDbDuplicateEventDetector';

/**
 * Entry point for the lambda function
 * @param event the hook event
 */
export const handler = async (event: HookEvent): Promise<any> => {
  if (event.httpMethod === 'GET') {
    const oktaVerification = new OktaVerification();
    return oktaVerification.verify(event);
  }
  if (event.httpMethod === 'POST') {
    const secretService = new AwsSecretsService();
    await secretService.init();

    const oktaHooks = new OktaHooks(
      secretService,
      new DuoUpdateRecipient(secretService),
      new AwsDynamoDbDuplicateEventDetector());

    // TODO do not wait for processing
    return oktaHooks.processEvent(event);
  }
  return {
    statusCode: 500,
    body: `unhandled httpMethod ${event.httpMethod}`,
  };
};
