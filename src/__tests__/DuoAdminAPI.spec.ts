import axios from 'axios';
import { DuoAdminAPI } from '../DuoAdminAPI';
import { DuoRequest } from '../DuoRequest';

const integrationKey = 'integrationKey';
const signatureSecret = 'signatureSecret';
const duoAdminApiHost = 'https://duoTest.com';
const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);

describe('getSignedAuthHeader', () => {
  it('should sign auth POST request', async () => {
    const signedHeader = adminAPI.getSignedAuthHeader(new DuoRequest('POST', '/some/url', { name : 'test' }));
    expect(signedHeader.date).toBeTruthy();
    expect(signedHeader.authorization).toBeTruthy();
  });
});