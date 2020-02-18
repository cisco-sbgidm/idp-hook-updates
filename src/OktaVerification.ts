import { HookEvent } from './Hook';
import { Response } from './Api';

/**
 * Implements Okta hook verification.
 */
export class OktaVerification {

  verify(event: HookEvent): Response {
    return {
      statusCode: 200,
      body: JSON.stringify({
        verification: event.headers ? event.headers['X-Okta-Verification-Challenge'] : '',
      }),
    };
  }
}
