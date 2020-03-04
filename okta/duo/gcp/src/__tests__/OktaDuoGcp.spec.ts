const request = require('supertest');
const oktaDuoGcp = require('../OktaDuoGcp');

jest.mock('@core/RedisCacheDuplicateEventDetector');
jest.mock('@gcp/GcpSecretsService');
jest.mock('@duo/DuoUpdateRecipient');
jest.mock('@common/OktaHooks');

describe('Test All Endpoints', () => {
  describe('GET Endpoint', () => {
    it('should call verification for a GET request', async (done) => {
      request(oktaDuoGcp).get('/').set('X-Okta-Verification-Challenge', 'dummy').then((response: any) => {
        expect(response.statusCode).toBe(200);
        expect(response.body).toStrictEqual({
          verification: 'dummy',
        });
        done();
      });
    });
  });

  describe('POST Endpoint', () => {
    it('should process event for a POST request', async (done) => {
      request(oktaDuoGcp).post('/').then((response: any) => {
        expect(response.statusCode).toBe(200);
        done();
      });
    });

    it('should return error for unsupported HTTP methods', async (done) => {
      request(oktaDuoGcp).delete('/').then((response: any) => {
        expect(response.statusCode).toBe(404);
        done();
      });
    });
  });
});