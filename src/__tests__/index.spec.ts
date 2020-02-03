import { handler } from '../index';
import { HookEvent } from '../Hook';

jest.mock('../AwsSecretsService');
jest.mock('../AwsDynamoDbDuplicateEventDetector');
jest.mock('../DuoUpdateRecipient');
jest.mock('../OktaHooks');

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

it('should call verification for a GET request', async () => {
  const event: HookEvent = {
    body: '',
    headers: {
      'X-Okta-Verification-Challenge': 'dummy',
    },
    httpMethod: 'GET',
  };
  const res = await handler(event);
  expect(res).toEqual({
    statusCode: 200,
    body: JSON.stringify({
      verification: event.headers['X-Okta-Verification-Challenge'],
    }),
  });
});

it('should process event for a POST request', async () => {
  const event: HookEvent = {
    body: '',
    headers: {},
    httpMethod: 'POST',
  };
  const res = await handler(event);
  expect(res).toEqual({
    statusCode: 200,
  });
});
