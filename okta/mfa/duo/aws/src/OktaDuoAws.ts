import { AwsSecretsService } from '@aws/AwsSecretsService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { OktaVerification } from '@common/OktaVerification';
import { HookEvent } from '@core/Hook';
import { OktaHooks } from '@common/OktaHooks';
import { AwsDynamoDbDuplicateEventDetector } from '@aws/AwsDynamoDbDuplicateEventDetector';

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
