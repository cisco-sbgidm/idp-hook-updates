import { OktaVerification } from '../src/OktaVerification';

it('should return the Okta verification header in the response', () => {
  const verifier = new OktaVerification();
  const challengeValue = 'challengeValue';

  // @ts-ignore
  const res = verifier.verify({
    headers: {
      'X-Okta-Verification-Challenge': challengeValue,
    },
  });

  expect(res).toEqual({
    statusCode: 200,
    body: JSON.stringify({
      verification: challengeValue,
    }),
  });
});
