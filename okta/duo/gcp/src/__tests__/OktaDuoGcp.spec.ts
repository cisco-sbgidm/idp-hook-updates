const myFunctions = require('../index');

jest.mock('@core/RedisCacheDuplicateEventDetector');
jest.mock('@gcp/GcpSecretsService');
jest.mock('@duo/DuoUpdateRecipient');
jest.mock('@common/OktaHooks');

describe('Test All Endpoints', () => {
  describe('GET Endpoint', () => {
    it('should call verification for a GET request', async (done) => {
      const req = { body: '', headers: { 'X-Okta-Verification-Challenge': 'dummy' }, method: 'GET' };
      // A fake response object, with a stubbed methods
      const res = {
        setHeader: () => Promise.resolve(),
        set: () => Promise.resolve(),
        send: (message: any) => {
          console.log(message);
          expect(message).toStrictEqual('{\"verification\":\"dummy\"}');
          done();
        },
      };
      // Invoke addMessage with our fake request and response objects. This will cause the
      // assertions in the response object to be evaluated.
      myFunctions.oktaDuoGcp(req, res);
    });
  });

  describe('POST endpoint', () => {
    it('should process event for a POST request', (done) => {
      const req = { body: '', headers: {}, method: 'POST' };
      // A fake response object, with a stubbed methods
      const jsonFun = jest.fn(() => Promise.resolve());
      const res = {
        json: jsonFun,
      };
      myFunctions.oktaDuoGcp(req, res).then(() => {
        expect(jsonFun).toBeCalled();
        done();
      });
    });

    it('should return error for unsupported HTTP methods', (done) => {
      const req = { body: '', headers: {}, method: 'DELETE' };
      // A fake response object, with a stubbed methods
      const res = {
        status: (code: number) => {
          expect(code).toEqual(500);
          return res;
        },
        send: (message: string) => {
          expect(message).toStrictEqual('unhandled httpMethod DELETE');
          done();
        },
      };
      myFunctions.oktaDuoGcp(req, res);
    });
  });
});