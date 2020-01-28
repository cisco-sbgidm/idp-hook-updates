import { HookEvent } from './Hook';
import { Response } from './AwsApiGateway';

/**
 * Implements Okta hook verification.
 */
export class OktaVerification {

  verify(event: HookEvent): Response {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        verification: event.headers['X-Okta-Verification-Challenge'],
      }),
    };
    return response;
  }

}
