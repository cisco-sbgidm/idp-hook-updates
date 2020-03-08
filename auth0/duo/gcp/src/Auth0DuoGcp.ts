import { GcpSecretsService } from '@gcp/GcpSecretsService';
import { DuoUpdateRecipient } from '@duo/DuoUpdateRecipient';
import { Auth0Hooks } from '@common/Auth0Hooks';
import { HookEvent } from '@core/Hook';
import { Request, Response } from 'express';

const getEvent = (request: Request): HookEvent => {
  return {
    body: JSON.stringify(request.body),
    headers: request.headers,
    httpMethod: request.method,
  };
};

exports.auth0DuoGcp = async (request: Request, response: Response) => {
  if (request.method === 'POST') {
    const secretService = new GcpSecretsService();
    await secretService.init();

    const auth0Hooks = new Auth0Hooks(
        secretService,
        new DuoUpdateRecipient(secretService));
    const res = await auth0Hooks.processEvent(getEvent(request));
    response.status(res.statusCode).json(res.body);
  } else {
    response.status(500).send(`unhandled httpMethod ${request.method}`);
  }
};