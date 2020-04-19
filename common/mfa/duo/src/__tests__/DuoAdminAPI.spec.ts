import { DuoAdminAPI, DuoCreateIntegrationResponse, DuoRequest } from '../DuoAdminAPI';
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
const webSdkParams = 'name=webSdkName&type=websdk';

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
    const createAdminApiResponse = new DuoCreateIntegrationResponse('someIkey', 'someSkey', adminApiName);
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
    await adminAPI.deleteIntegration('111');
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
    await adminAPI.deleteIntegration('111').catch(() => {
      expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations/111', duoHeaders);
      done();
    });
  });
});

describe('#setupIdpHookAdminApi', () => {
  it('should fail to create admin api when fetching the admin apis fails', async (done) => {
    const axiosClientFunctionMock = jest.fn((url) => {
      return Promise.resolve({ data: { stat: 'FAIL' } });
    });
    // @ts-ignore
    axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
    const createIdpHookAdminAPIFn = jest.fn(() => Promise.resolve({}));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    adminAPI.createIdpHookAdminAPI = createIdpHookAdminAPIFn;
    try {
      await adminAPI.setupIdpHookAdminApi(adminApiName);
    } catch (e) {
      expect(axiosClientFunctionMock.mock.calls).toEqual([
        ['/admin/v1/integrations?limit=100&offset=0', duoHeaders],
      ]);
      expect(createIdpHookAdminAPIFn).not.toHaveBeenCalled();
      done();
    }
  });

  it('should create admin api', async () => {
    const axiosClientFunctionMock = jest.fn((url) => {
      return Promise.resolve({ data: { stat: 'OK', response: [] } });
    });
    // @ts-ignore
    axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
    const createIdpHookAdminAPIFn = jest.fn(() => Promise.resolve({}));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    adminAPI.createIdpHookAdminAPI = createIdpHookAdminAPIFn;

    await adminAPI.setupIdpHookAdminApi(adminApiName);

    expect(axiosClientFunctionMock.mock.calls).toEqual([
      ['/admin/v1/integrations?limit=100&offset=0', duoHeaders],
    ]);
    expect(createIdpHookAdminAPIFn).toHaveBeenCalledWith(adminApiName);
  });

  it('should create admin api, using paging while looking for existing admin api', async () => {
    const axiosClientFunctionMock = jest.fn((url) => {
      if (url === '/admin/v1/integrations?limit=100&offset=0') {
        return Promise.resolve({ data: { stat: 'OK', response: [{ name: 'foo' }] } });
      }
      return Promise.resolve({
        data: {
          stat: 'OK',
          response: [{ name: 'bar' }, { name: adminApiName, integration_key: integrationKey }],
        },
      });
    });

    // @ts-ignore
    axios.create = jest.fn(() => ({ get: axiosClientFunctionMock }));
    const createIdpHookAdminAPIFn = jest.fn(() => Promise.resolve({}));
    const deleteAdminApiFn = jest.fn(() => Promise.resolve({}));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    adminAPI.createIdpHookAdminAPI = createIdpHookAdminAPIFn;
    adminAPI.deleteIntegration = deleteAdminApiFn;

    await adminAPI.setupIdpHookAdminApi(adminApiName);

    expect(axiosClientFunctionMock.mock.calls).toEqual([
      ['/admin/v1/integrations?limit=100&offset=0', duoHeaders], // page 1
      ['/admin/v1/integrations?limit=100&offset=100', duoHeaders],  // page 2
    ]);
    expect(deleteAdminApiFn).toHaveBeenCalledWith(integrationKey);
    expect(createIdpHookAdminAPIFn).toHaveBeenCalledWith(adminApiName);
  });
});

describe('createWebSdk', () => {
  it('should execute create web sdk', async () => {
    const createIntegrationResponse = new DuoCreateIntegrationResponse('someIkey', 'someSkey', 'webSdkName');
    const axiosClientFunctionMock = jest.fn(() => Promise.resolve(createIntegrationResponse));
    // @ts-ignore
    axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    await adminAPI.createWebSdk('webSdkName');
    expect(axiosClientFunctionMock.mock.calls).toEqual([
                                                         ['/admin/v1/integrations', webSdkParams, duoHeaders],
    ]);
    expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations', webSdkParams, duoHeaders);
  });

  it('should handle error when webSdkName fails', async (done) => {
    const axiosClientFunctionMock = jest.fn(() => Promise.reject(axiosError));
    // @ts-ignore
    axios.create = jest.fn(() => ({ post: axiosClientFunctionMock }));
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    await adminAPI.createWebSdk('webSdkName').catch(() => {
      expect(axiosClientFunctionMock).toHaveBeenCalledWith('/admin/v1/integrations', webSdkParams, duoHeaders);
      done();
    });
  });
});

describe('#encodeForDuo', () => {
  it('should properly encode special characters', () => {
    const adminAPI = new DuoAdminAPI(integrationKey, signatureSecret, duoAdminApiHost);
    expect(adminAPI.encodeForDuo('test=escape')).toEqual('test%3Descape');
    expect(adminAPI.encodeForDuo('!test!')).toEqual('%21test%21');
    expect(adminAPI.encodeForDuo('\'test\'')).toEqual('%27test%27');
    expect(adminAPI.encodeForDuo('(test)')).toEqual('%28test%29');
    expect(adminAPI.encodeForDuo('test**')).toEqual('test%2A%2A');
  });
});
