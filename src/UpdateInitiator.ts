import { Response } from './Api';
import { HookEvent } from './Hook';
import { Profile } from './Helper';

export interface InitiatorUser {
  id: string;
  username?: string;
  profile?: Profile;
}

/**
 * Describes a service for processing an IdP hook event.
 */
export interface UpdateInitiator {
  processEvent(hookEvent: HookEvent): Promise<Response>;
}
