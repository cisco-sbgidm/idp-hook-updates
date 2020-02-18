import { EnvSecretsService } from '../EnvSecretsService';
const using = require('jasmine-data-provider');

describe('init', () => {
  const OLD_ENV = process.env;
  const service = new EnvSecretsService();

  async function shouldFailIfPropNotSet(prop: string) {
    try {
      await service.init();
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual(`${prop} is not set`);
    }
  }

  function envProvider() {
    return [
      { a: 'INITIATOR_API_KEY' },
      { a: 'RECIPIENT_AUTHORIZATION_SECRET' },
      { a: 'RECIPIENT_INTEGRATION_KEY' },
      { a: 'SIGNATURE_SECRET' },
    ];
  }

  using(envProvider, (data: any) => {
    beforeEach(() => {
      process.env = { ...OLD_ENV };
      process.env.INITIATOR_API_KEY = 'INITIATOR_API_KEY';
      process.env.RECIPIENT_AUTHORIZATION_SECRET = 'RECIPIENT_AUTHORIZATION_SECRET';
      process.env.RECIPIENT_INTEGRATION_KEY = 'RECIPIENT_INTEGRATION_KEY';
      process.env.SIGNATURE_SECRET = 'SIGNATURE_SECRET';
    });

    afterEach(() => {
      process.env = OLD_ENV;
    });

    it('should throw an error if INITIATOR_API_KEY is not set', async () => {
      process.env[`${data.a}`] = undefined;
      await shouldFailIfPropNotSet(data.a);
    });
  });

});
