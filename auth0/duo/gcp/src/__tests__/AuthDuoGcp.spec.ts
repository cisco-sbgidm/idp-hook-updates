const myFunctions = require('../index');

jest.mock('@gcp/GcpSecretsService');
jest.mock('@duo/DuoUpdateRecipient');
jest.mock('@common/Auth0Hooks');

describe('Test All Endpoints', () => {
  describe('POST endpoint', () => {
    it('should process event for a POST request', (done) => {
      const req = { body: '', headers: {}, method: 'POST' };
      // A fake response object, with a stubbed methods
      const res = {
        status: (code: number) => {
          expect(code).toEqual(200);
          return res;
        },
        json: (message: any) => {
          done();
        },
      };
      // Invoke addMessage with our fake request and response objects. This will cause the
      // assertions in the response object to be evaluated.
      myFunctions.auth0DuoGcp(req, res);
    });

    it('should return error for unsupported HTTP methods', (done) => {
      const req = { body: '', headers: {}, method: 'DELETE' };
      // A fake response object, with a stubbed methods
      const res = {
        status: (code: number) => {
          expect(code).toEqual(500);
          return res;
        },
        send: (message: any) => {
          expect(message).toStrictEqual('unhandled httpMethod DELETE');
          done();
        },
      };
      myFunctions.auth0DuoGcp(req, res);
    });
  });
});