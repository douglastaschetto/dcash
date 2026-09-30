import { ArgumentsHost, BadRequestException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter';

function mockHost() {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const response = { status };
  const request = { method: 'GET', url: '/api/whatever' };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('preserves status and message for a known HttpException', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = mockHost();

    filter.catch(new BadRequestException('E-mail já cadastrado'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'E-mail já cadastrado',
        path: '/api/whatever',
      }),
    );
  });

  it('maps an unknown error to a generic 500 without leaking internals', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = mockHost();

    filter.catch(
      new Error('password authentication failed for user "postgres"'),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    const body = json.mock.calls[0][0];
    expect(body.statusCode).toBe(500);
    expect(body.message).not.toContain('postgres');
  });
});
