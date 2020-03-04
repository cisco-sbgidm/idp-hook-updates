import { HookEvent } from '@core/Hook';
import { Response } from '@core/Api';

/**
 * Implements Okta hook verification.
 */
export class OktaVerification {

  verify(event: HookEvent): Response {
    const response = {
      statusCode: 200,
      body: JSON.stringify({
        verification: event.headers['X-Okta-Verification-Challenge'] || event.headers['x-okta-verification-challenge'],
      }),
    };
    return response;
  }

}
