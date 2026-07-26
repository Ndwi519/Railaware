var _globals = require("@jest/globals");
var _logger = require("../../utils/logger.js");
describe('Logger', () => {
  let stderrSpy;
  let originalEnv;
  beforeEach(() => {
    originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development'; // Ensure it logs
    stderrSpy = _globals.jest.spyOn(process.stderr, 'write').mockImplementation(() => {});
  });
  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    stderrSpy.mockRestore();
  });
  test('logs info as JSON to stderr', () => {
    const logger = (0, _logger.createLogger)('test', 'corr-1');
    logger.info('Hello', {
      id: 1
    });
    expect(stderrSpy).toHaveBeenCalled();
    const logged = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(logged.level).toBe('info');
    expect(logged.module).toBe('test');
    expect(logged.correlationId).toBe('corr-1');
    expect(logged.message).toBe('Hello');
    expect(logged.context).toEqual({
      id: 1
    });
  });
  test('logs error with stack trace', () => {
    const logger = (0, _logger.createLogger)('test');
    const err = new Error('oops');
    logger.error('Error occurred', err, {
      contextVal: 2
    });
    expect(stderrSpy).toHaveBeenCalled();
    const logged = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(logged.level).toBe('error');
    expect(logged.stack).toBeDefined();
  });
  test('child logger uses child correlationId', () => {
    const logger = (0, _logger.createLogger)('test').child('child-corr');
    logger.warn('Child warning');
    expect(stderrSpy).toHaveBeenCalled();
    const logged = JSON.parse(stderrSpy.mock.calls[0][0]);
    expect(logged.correlationId).toBe('child-corr');
  });
});