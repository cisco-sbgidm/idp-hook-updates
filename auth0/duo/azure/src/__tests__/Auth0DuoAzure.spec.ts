import { handler } from '../Auth0DuoAzure';

jest.mock('@idp-azure/AzureKeyVaultService');
jest.mock('@duo/DuoUpdateRecipient');
jest.mock('@common/Auth0Hooks');

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

it('should process event for a POST request', async () => {
  const ctx: any = {};
  const req = {
    body: '[]',
    headers: {},
    method: 'POST',
  };
  const res = await handler(ctx, req);
  expect(res).toEqual({
    status: 200,
  });
});
