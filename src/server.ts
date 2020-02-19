import { EnvSecretsService } from './EnvSecretsService';
import { DuoUpdateRecipient } from './DuoUpdateRecipient';
import { OktaVerification } from './OktaVerification';
import { OktaHooks } from './OktaHooks';
import { CacheDuplicateEventDetector } from './CacheDuplicateEventDetector';
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

function getEvent(request: Request) {
  return {
    body: request.body,
    headers: request.headers,
    httpMethod: request.method,
  };
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (request: Request, response: Response) => {
  const event = getEvent(request);
  const oktaVerification = new OktaVerification();
  console.log('=====> %j', event);
  response.json(JSON.parse(oktaVerification.verify(event).body!));
});

app.post('/', async (request: Request, response: Response) => {
  const secretService = new EnvSecretsService();
  await secretService.init();
  const oktaHooks = new OktaHooks(
      secretService,
      new DuoUpdateRecipient(secretService),
      new CacheDuplicateEventDetector(),
  );
  response.json(oktaHooks.processEvent(getEvent(request)));
});

module.exports = app;