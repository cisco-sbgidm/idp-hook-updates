const request = require('supertest');
const auth0DuoGcp = require('../Auth0DuoGcp');

jest.mock('@gcp/GcpSecretsService');
jest.mock('@duo/DuoUpdateRecipient');
jest.mock('@common/Auth0Hooks');

describe('Test All Endpoints', () => {
  describe('POST Endpoint', () => {
    it('should process event for a POST request', async (done) => {
      request(auth0DuoGcp).post('/').then((response: any) => {
        expect(response.statusCode).toBe(200);
        done();
      });
    });

    it('should return error for unsupported HTTP methods', async (done) => {
      request(auth0DuoGcp).delete('/').then((response: any) => {
        expect(response.statusCode).toBe(404);
        done();
      });
    });
  });
});