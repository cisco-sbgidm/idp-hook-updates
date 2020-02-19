import { HookEvent } from '../Hook';
const request = require('supertest');
const app = require('../server');

jest.mock('../DuoUpdateRecipient');
jest.mock('../OktaHooks');
jest.mock('../EnvSecretsService');

describe('Test All Endpoints', () => {
  describe('GET Endpoint', () => {
    it('should call verification for a GET request', async (done) => {
      const event: HookEvent = {
        body: '',
        headers: {
          'X-Okta-Verification-Challenge': 'dummy',
        },
        httpMethod: 'GET',
      };
      request(app).get('/').set('X-Okta-Verification-Challenge', 'dummy').then((response: any) => {
        expect(response.statusCode).toBe(200);
        expect(response.body).toStrictEqual({
          verification: event.headers['X-Okta-Verification-Challenge'],
        });
        done();
      });
    });
  });

  describe('POST Endpoint', () => {
    it('should process event for a POST request', async (done) => {
      request(app).post('/').then((response: any) => {
        expect(response.statusCode).toBe(200);
        done();
      });
    });

    it('should return error for unsupported HTTP methods', async (done) => {
      request(app).delete('/').then((response: any) => {
        expect(response.statusCode).toBe(404);
        done();
      });
    });
  });
});
