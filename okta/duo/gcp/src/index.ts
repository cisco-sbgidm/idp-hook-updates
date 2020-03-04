import { GcpSecretsService } from '@gcp/GcpSecretsService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { OktaHooks } from '@common/OktaHooks';
import { HookEvent } from '@core/Hook';
import { Request, Response } from 'express';
import { RedisCacheDuplicateEventDetector } from '@core/RedisCacheDuplicateEventDetector';
import { OktaVerification } from '@common/OktaVerification';

exports.oktaDuoGcp = async (request: Request, response: Response) => {
  if (request.method === 'GET') {
    response.setHeader('Content-Type', 'application/json');
    response.set({ 'content-type': 'application/json; charset=utf-8' });
    const oktaVerification = new OktaVerification();
    const event = getEvent(request);
    response.send(oktaVerification.verify(event).body);

  } else if (request.method === 'POST') {
    const secretService = new GcpSecretsService();
    await secretService.init();
    const oktaHooks = new OktaHooks(
      secretService,
      new DuoUpdateRecipient(secretService),
      new RedisCacheDuplicateEventDetector(),
    );
    response.json(oktaHooks.processEvent(getEvent(request)));

  } else {
    response.status(500).send(`unhandled httpMethod ${request.method}`);
  }
};

const getEvent = (request: Request): HookEvent => {
  return {
    body: JSON.stringify(request.body),
    headers: request.headers,
    httpMethod: request.method,
  };
};