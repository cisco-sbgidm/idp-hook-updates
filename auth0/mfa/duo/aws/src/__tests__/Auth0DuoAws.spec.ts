import { handler } from '../Auth0DuoAws';
import { HookEvent } from '../Hook';

jest.mock('../AwsSecretsService');
jest.mock('../DuoUpdateRecipient');
jest.mock('../Auth0Hooks');

it('should return error for unsupported HTTP methods', async () => {
  const event: HookEvent = {
    body: '',
    headers: {},
    httpMethod: 'DELETE',
  };
  const res = await handler(event);
  expect(res).toEqual({
    statusCode: 500,
    body: `unhandled httpMethod ${event.httpMethod}`,
  });
});

it('should process event for a POST request', async () => {
  const event: HookEvent = {
    body: '[]',
    headers: {},
    httpMethod: 'POST',
  };
  const res = await handler(event);
  expect(res).toEqual({
    statusCode: 200,
  });
});
