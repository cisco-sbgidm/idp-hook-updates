import { GcpSecretsService } from '@gcp/GcpSecretsService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { OktaVerification } from '@common/OktaVerification';
import { OktaHooks } from '@common/OktaHooks';
import { HookEvent } from '@core/Hook';
import { RedisCacheDuplicateEventDetector } from '@core/RedisCacheDuplicateEventDetector';
import express, { Request, Response } from 'express';

const app = express();
app.use(express.json());

const getEvent = (request: Request): HookEvent => {
  return {
    body: JSON.stringify(request.body),
    headers: request.headers,
    httpMethod: request.method,
  };
};

// http://expressjs.com/en/starter/basic-routing.html
app.get('/', (request: Request, response: Response) => {
  response.setHeader('Content-Type', 'application/json');
  response.set({ 'content-type': 'application/json; charset=utf-8' });
  const oktaVerification = new OktaVerification();
  const event = getEvent(request);
  response.send(oktaVerification.verify(event).body);
});

app.post('/', async (request: Request, response: Response) => {
  const secretService = new GcpSecretsService();
  await secretService.init();
  const oktaHooks = new OktaHooks(
      secretService,
      new DuoUpdateRecipient(secretService),
      new RedisCacheDuplicateEventDetector(),
  );
  response.json(oktaHooks.processEvent(getEvent(request)));
});

module.exports = app;