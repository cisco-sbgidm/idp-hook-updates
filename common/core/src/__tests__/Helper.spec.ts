import { Helper } from '../Helper';

it.each(
  [
    [200, true],
    [200, true],
    [404, false],
    [302, false],
    [100, false],
  ],
)('should identify HTTP status code %s as %b', async (code: number, isHttpSuccess: boolean) => {
  expect(Helper.isHttpCodeSuccess(code)).toEqual(isHttpSuccess);
});

describe('#logError', () => {
  const mockedConsoleError = jest.fn();
  const CONSOLE_ERR = console.error;

  beforeEach(() => console.error = mockedConsoleError);
  afterEach(() => console.error = CONSOLE_ERR);

  it('should throw error without logging', () => {
    try {
      // @ts-ignore since this does not implement all the AxiosError interface
      Helper.logError({});
      fail('should throw error');
    } catch (e) {
      expect(mockedConsoleError).not.toHaveBeenCalled();
    }
  });

  it('should throw error with logging', () => {
    const response = {
      data: 'foo',
      status: 1122,
      headers: ['baz'],
    };

    try {
      // @ts-ignore since this does not implement all the AxiosError interface
      Helper.logError({ response });
      fail('should throw error');
    } catch (e) {
      expect(mockedConsoleError.mock.calls).toEqual(
        [
          [response.data],
          [response.status],
          [response.headers],
        ],
      );
    }
  });
});
