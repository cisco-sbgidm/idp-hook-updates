import { Profile } from './Helper';
import { InitiatorUser } from './UpdateInitiator';

export interface RecipientUser {
}

/**
 * Describes a recipient IdP to update.
 */
export interface UpdateRecipient {

  getUser(username: string): RecipientUser;

  create(user: InitiatorUser): Promise<string>;

  delete(user: RecipientUser): Promise<any>;

  disable(user: RecipientUser): Promise<any>;

  reenable(user: RecipientUser): Promise<any>;

  updateProfile(userToUpdate: RecipientUser, newProfileDetails: Profile): Promise<any>;

  addUserToGroup(user: RecipientUser, groupName: string, jit: boolean): Promise<any>;

  addUserToGroupByUserId(userId: string, groupName: string, jit: boolean): Promise<any>;

  removeUserFromGroup(user: RecipientUser, groupName: string): Promise<any>;

  resetUser(user: RecipientUser, factor: string): Promise<any>;

  createGroup(name: string, alternateId?: string): Promise<any>;

  renameGroup(alternateId: string, newName: string): Promise<any>;

  deleteGroup(name: string): Promise<any>;
}
