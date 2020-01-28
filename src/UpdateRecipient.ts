export interface Profile {
}

export interface User {
}

/**
 * Describes a recipient IdP to update.
 */
export interface UpdateRecipient {

  getUser(username: string): User;

  create(user: User): Promise<any>;

  delete(user: User): Promise<any>;

  disable(user: User): Promise<any>;

  reenable(user: User): Promise<any>;

  updateProfile(userToUpdate: User, newProfileDetails: Profile): Promise<any>;

}
