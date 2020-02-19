import { HookEvent } from '../Hook';
import { Response } from '../AwsApiGateway';

/**
 * Mock
 */
export class Auth0Hooks {
  async processEvent(hookEvent: HookEvent): Promise<Response> {
    const res: Response = {
      statusCode: 200,
    };
    return Promise.resolve(res);
  }
}
