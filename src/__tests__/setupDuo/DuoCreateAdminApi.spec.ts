import { DuoCreateAdminApi, DuoCreateAdminApiResponse } from '../../setupDuoScript/DuoCreateAdminApi';
import { DuoAdminAPI } from '../../DuoAdminAPI';
import axios from 'axios';

const integrationKey = 'integrationKey';
const signatureSecret = 'signatureSecret';
const duoAdminApiHost = 'https://duoTest.com';
const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
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

describe('createIdpHookAdminAPI', () => {
  it('should execute create admin Api', async () => {
    const createAdminApiResponse = new DuoCreateAdminApiResponse('someIkey', 'someSkey', adminApiName);
    const axiosClientFunctionMock = jest.fn(() => Promise.resolve(createAdminApiResponse));
    // @ts-ignore
    axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
    const createAdminApi = new DuoCreateAdminApi(adminAPI);
    await createAdminApi.createIdpHookAdminAPI(adminApiName);
    expect(axiosClientFunctionMock.mock.calls).toEqual([
       ['/admin/v1/integrations', params, duoHeaders],
    ]);
    expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations', params, duoHeaders);
  });

  it('should handle error when create admin Api fails', async (done) => {
    const axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
    const createAdminApi = new DuoCreateAdminApi(adminAPI);
    await createAdminApi.createIdpHookAdminAPI(adminApiName).catch(() => {
      expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations', params, duoHeaders);
      done();
    });
  });
});