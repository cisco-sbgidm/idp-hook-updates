import { Response } from './AwsApiGateway';
import { HookEvent } from './Hook';

/**
 * Describes a service for processing an IdP hook event.
 */
export interface UpdateInitiator {
  processEvent(hookEvent: HookEvent): Promise<Response>;
}
