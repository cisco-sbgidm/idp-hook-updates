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
    body: JSON.stringify(request.body),
    headers: request.headers,
    httpMethod: request.method,
  };
}

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (request: Request, response: Response) => {
  const oktaVerification = new OktaVerification();
  const event = getEvent(request);
  // TODO remove the log
  console.log('=====> %j', event);
  response.setHeader('Content-Type', 'application/json');
  response.set({ 'content-type': 'application/json; charset=utf-8' });
  response.send(oktaVerification.verify(event).body);
});

app.post('/', async (request: Request, response: Response) => {
  const secretService = new EnvSecretsService();
  await secretService.init();
  const oktaHooks = new OktaHooks(
      secretService,
      new DuoUpdateRecipient(secretService),
      new CacheDuplicateEventDetector(),
  );
  const event = getEvent(request);
  // TODO remove the log
  console.log('=====> %j', event);
  response.json(oktaHooks.processEvent(event));
});

module.exports = app;