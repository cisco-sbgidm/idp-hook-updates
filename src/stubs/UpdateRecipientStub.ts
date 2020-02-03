import { Profile, UpdateRecipient, User } from '../UpdateRecipient';

export const recipientUser = {
  uid: '111',
};

export class UpdateRecipientStub implements UpdateRecipient {

  addUserToGroup(user: User, groupName: string): Promise<any> {
    return Promise.resolve();
  }

  create(user: User): Promise<any> {
    return Promise.resolve();
  }

  delete(user: User): Promise<any> {
    return Promise.resolve();
  }

  disable(user: User): Promise<any> {
    return Promise.resolve();
  }

  getUser(username: string): User {
    return Promise.resolve(recipientUser);
  }

  reenable(user: User): Promise<any> {
    return Promise.resolve();
  }

  removeUserFromGroup(user: User, groupName: string): Promise<any> {
    return Promise.resolve();
  }

  resetUser(user: User, factor: string): Promise<any> {
    return Promise.resolve();
  }

  updateProfile(userToUpdate: User, newProfileDetails: Profile): Promise<any> {
    return Promise.resolve();
  }

}
