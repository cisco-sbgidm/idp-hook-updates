import * as _ from 'lodash';
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
        verification: _.get(event.headers, 'X-Okta-Verification-Challenge') || _.get(event.headers, 'x-okta-verification-challenge'),
      }),
    };
  }
}
