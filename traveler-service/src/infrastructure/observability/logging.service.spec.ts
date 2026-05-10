import { LoggingService } from './logging.service';

describe('LoggingService', () => {
  let service: LoggingService;
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    service = new LoggingService();
    // Spy on the internal winston logger
    logSpy = jest.spyOn((service as any).logger, 'info').mockImplementation(() => ({}));
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => ({}));
    jest.spyOn((service as any).logger, 'warn').mockImplementation(() => ({}));
    jest.spyOn((service as any).logger, 'debug').mockImplementation(() => ({}));
  });

  afterEach(() => jest.restoreAllMocks());

  it('should include service and correlationId in every log entry', () => {
    service.setCorrelationId('corr-abc');
    service.log('test message', 'TestContext');

    expect(logSpy).toHaveBeenCalledWith(
      'test message',
      expect.objectContaining({
        correlationId: 'corr-abc',
        context: 'TestContext',
      }),
    );
  });

  it('should include correlationId when not set (empty string)', () => {
    service.log('another message');

    expect(logSpy).toHaveBeenCalledWith(
      'another message',
      expect.objectContaining({ correlationId: '' }),
    );
  });

  it('should call error level for error()', () => {
    const errorSpy = jest.spyOn((service as any).logger, 'error');
    service.error('an error', 'trace-stack');
    expect(errorSpy).toHaveBeenCalledWith(
      'an error',
      expect.objectContaining({ trace: 'trace-stack' }),
    );
  });

  it('should call warn level for warn()', () => {
    const warnSpy = jest.spyOn((service as any).logger, 'warn');
    service.warn('a warning');
    expect(warnSpy).toHaveBeenCalledWith(
      'a warning',
      expect.objectContaining({ correlationId: '' }),
    );
  });
});
