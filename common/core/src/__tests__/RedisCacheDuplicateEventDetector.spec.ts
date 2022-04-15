import { RedisCacheDuplicateEventDetector } from '../RedisCacheDuplicateEventDetector';
import { createClient } from 'redis';

const getFn = jest.fn(key => new Promise((resolve, reject) => {
  resolve(true);
}));
const setexFn = jest.fn((key, seconds, val) => new Promise((resolve, reject) => {
  resolve(val);
}));

// @ts-ignore
createClient = jest.fn(() => ({
  get: getFn,
  setex: setexFn,
}));

const OLD_ENV = process.env;
const EVENT_ID = '111';
const REDIS_CACHE_PORT = 6379;
const REDIS_CACHE_KEY = 'REDIS_CACHE_KEY';
const REDIS_CACHE_HOSTNAME = 'REDIS_CACHE_HOSTNAME';

beforeEach(() => {
  process.env = { ...OLD_ENV };
  process.env.REDIS_CACHE_KEY = REDIS_CACHE_KEY;
  process.env.REDIS_CACHE_HOSTNAME = REDIS_CACHE_HOSTNAME;
  process.env.REDIS_CACHE_PORT = REDIS_CACHE_PORT.toString(10);
});

afterEach(() => {
  process.env = OLD_ENV;
});

describe('without env variables', () => {
  it.each(
    [
      ['REDIS_CACHE_KEY'],
      ['REDIS_CACHE_HOSTNAME'],
      ['REDIS_CACHE_PORT'],
    ],
  )('should fail if %s env variable is not defined', (missingEnvVar: string) => {
    delete process.env[missingEnvVar];
    try {
      new RedisCacheDuplicateEventDetector();
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual(`${missingEnvVar} is not set`);
    }
  });
});

describe('with all env variables', () => {
  it('should fail if port is not a number', () => {
    process.env.REDIS_CACHE_PORT = 'not a number';
    try {
      new RedisCacheDuplicateEventDetector();
      fail('should throw error');
    } catch (e) {
      expect(e.message).toEqual(`REDIS_CACHE_PORT is not a number ${process.env.REDIS_CACHE_PORT}`);
    }
  });

  it('should create redis client with correct paramters when auth and tls are required', async () => {
    const detector = new RedisCacheDuplicateEventDetector();
    await detector.isDuplicateEvent(EVENT_ID);
    expect(createClient).toHaveBeenCalledWith({
      url: `rediss://${process.env.REDIS_CACHE_HOSTNAME}:${process.env.REDIS_CACHE_PORT}`,
      password: process.env.REDIS_CACHE_KEY,
    });
  });

  it('should create redis client with correct paramters when auth and tls are not required', async () => {
    const detector = new RedisCacheDuplicateEventDetector(false);
    await detector.isDuplicateEvent(EVENT_ID);
    expect(createClient).toHaveBeenCalledWith();
  });

  it('should check if an event is a duplicate', async () => {
    const detector = new RedisCacheDuplicateEventDetector();
    await detector.isDuplicateEvent(EVENT_ID);
    expect(getFn).toHaveBeenCalledWith(EVENT_ID, expect.any(Function));
  });

  it('should add an event to the cache', async () => {
    const detector = new RedisCacheDuplicateEventDetector();
    await detector.startProcessingEvent(EVENT_ID);
    expect(setexFn).toHaveBeenCalledWith(EVENT_ID, 3600, expect.any(String), expect.any(Function));
  });
});
