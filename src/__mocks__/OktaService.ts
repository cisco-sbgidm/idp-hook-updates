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
    const mockOktaGetUser = jest.fn(() => Promise.resolve({
      profile: oktaUserProfile,
    }));

    return Promise.resolve({ profile: oktaUserProfile });
  }
}
