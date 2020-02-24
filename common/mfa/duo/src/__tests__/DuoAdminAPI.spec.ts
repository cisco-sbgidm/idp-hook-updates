import { DuoAdminAPI, DuoCreateAdminApiResponse, DuoRequest } from '../DuoAdminAPI';
import axios from 'axios';

const integrationKey = 'integrationKey';
const signatureSecret = 'signatureSecret';
const duoAdminApiHost = 'https://duoTest.com';

jest.mock('axios');

const duoHeaders = {
  headers: {
    Date: expect.any(String),
    Authorization: expect.any(String),
  },
};

const axiosError = {
  response: {
    data: 'data',
    status: 500,
    headers: ['foo', 'bar'],
  },
};

const adminApiName = 'testAdminApi';
const params = 'adminapi_read_resource=1&adminapi_write_resource=1&name=testAdminApi&type=adminapi';

describe('getSignedAuthHeader', () => {
  it('should sign auth POST request', async () => {
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    const signedHeader = adminAPI.getSignedAuthHeader(new DuoRequest('POST', '/some/url', { name : 'test' }));
    expect(signedHeader.date).toBeTruthy();
    expect(signedHeader.authorization).toBeTruthy();
  });
});

describe('createIdpHookAdminAPI', () => {
  it('should execute create admin Api', async () => {
    const createAdminApiResponse = new DuoCreateAdminApiResponse('someIkey', 'someSkey', adminApiName);
    const axiosClientFunctionMock = jest.fn(() => Promise.resolve(createAdminApiResponse));
    // @ts-ignore
    axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    await adminAPI.createIdpHookAdminAPI(adminApiName);
    expect(axiosClientFunctionMock.mock.calls).toEqual([
                                                         ['/admin/v1/integrations', params, duoHeaders],
    ]);
    expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations', params, duoHeaders);
  });

  it('should handle error when create admin Api fails', async (done) => {
    const axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    await adminAPI.createIdpHookAdminAPI(adminApiName).catch(() => {
      expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations', params, duoHeaders);
      done();
    });
  });
});

describe('deleteAdminApi', () => {
  it('should execute delete admin Api', async () => {
    const axiosClientFunctionMock = jest.fn(() => Promise.resolve('data: { stat: "OK" }'));
    // @ts-ignore
    axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    await adminAPI.deleteAdminApi('111');
    expect(axiosClientFunctionMock.mock.calls).toEqual([
                                                         ['/admin/v1/integrations/111', duoHeaders],
    ]);
    expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations/111', duoHeaders);
  });

  it('should handle error when delete admin Api fails', async (done) => {
    const axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({ delete: axiosClientFunctionMock }));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    await adminAPI.deleteAdminApi('111').catch(() => {
      expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations/111', duoHeaders);
      done();
    });
  });
});