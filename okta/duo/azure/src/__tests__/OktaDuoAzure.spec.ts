import { handler } from '../OktaDuoAzure';
import { HookEvent } from '@core/Hook';

jest.mock('@core/RedisCacheDuplicateEventDetector');
jest.mock('@idp-azure/AzureKeyVaultService');
jest.mock('@duo/DuoUpdateRecipient');
jest.mock('@common/OktaHooks');

it('should return error for unsupported HTTP methods', async () => {
  const ctx: any = {};
  const req = {
    body: '',
    headers: {},
    method: 'DELETE',
  };
  const res = await handler(ctx, req);
  expect(res).toEqual({
    status: 500,
    body: `unhandled httpMethod ${req.method}`,
  });
});

it('should call verification for a GET request', async () => {
  const ctx: any = {};
  const req = {
    body: '',
    headers: {
      'X-Okta-Verification-Challenge': 'dummy',
    },
    method: 'GET',
  };

  const res = await handler(ctx, req);
  expect(res).toEqual({
    status: 200,
    body: JSON.stringify({
      verification: req.headers['X-Okta-Verification-Challenge'],
    }),
  });
});

it('should process event for a POST request', async () => {
  const ctx: any = {};
  const req = {
    body: '',
    headers: {},
    method: 'POST',
  };
  const res = await handler(ctx, req);
  expect(res).toEqual({
    status: 200,
  });
});
