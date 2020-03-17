/**
 * Mock
 */
export class OktaService {
  async getUser(userId: string): Promise<any> {
    const oktaUserProfile = {
      email: 'test@test.com',
      firstName: 'first',
      lastName: 'last',
      middleName: 'middle',
    };
    return Promise.resolve({ profile: oktaUserProfile });
  }

  async getUserGroups(userId: string): Promise<any> {
    return Promise.resolve([]);
  }
}
