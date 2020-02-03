import { UpdateRecipient, RecipientUser } from '../UpdateRecipient';
import { Profile } from '../Helper';

export const recipientUser = {
  uid: '111',
};

export class UpdateRecipientStub implements UpdateRecipient {

  addUserToGroup(user: RecipientUser, groupName: string): Promise<any> {
    return Promise.resolve();
  }

  create(user: RecipientUser): Promise<string> {
    return Promise.resolve('999');
  }

  delete(user: RecipientUser): Promise<any> {
    return Promise.resolve();
  }

  disable(user: RecipientUser): Promise<any> {
    return Promise.resolve();
  }

  getUser(username: string): RecipientUser {
    return Promise.resolve(recipientUser);
  }

  reenable(user: RecipientUser): Promise<any> {
    return Promise.resolve();
  }

  removeUserFromGroup(user: RecipientUser, groupName: string): Promise<any> {
    return Promise.resolve();
  }

  resetUser(user: RecipientUser, factor: string): Promise<any> {
    return Promise.resolve();
  }

  updateProfile(userToUpdate: RecipientUser, newProfileDetails: Profile): Promise<any> {
    return Promise.resolve();
  }

  addUserToGroupByUserId(userId: string, groupName: string): Promise<any> {
    return Promise.resolve();
  }

}
