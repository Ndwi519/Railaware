import { ConfigurationError, ProviderError, ValidationError, TopologyError, RiskEngineError, CacheError, NetworkError } from '../../utils/errors.js';

describe('Custom Errors', () => {
    test('ConfigurationError', () => {
        const err = new ConfigurationError('test config error');
        expect(err.name).toBe('ConfigurationError');
        expect(err.message).toBe('test config error');
    });

    test('ProviderError', () => {
        const err = new ProviderError('test provider error');
        expect(err.name).toBe('ProviderError');
        expect(err.message).toBe('test provider error');
    });

    test('ValidationError', () => {
        const err = new ValidationError('test validation error');
        expect(err.name).toBe('ValidationError');
        expect(err.message).toBe('test validation error');
    });

    test('TopologyError', () => {
        const err = new TopologyError('test topology error');
        expect(err.name).toBe('TopologyError');
        expect(err.message).toBe('test topology error');
    });

    test('RiskEngineError', () => {
        const err = new RiskEngineError('test risk error');
        expect(err.name).toBe('RiskEngineError');
        expect(err.message).toBe('test risk error');
    });

    test('CacheError', () => {
        const err = new CacheError('test cache error');
        expect(err.name).toBe('CacheError');
        expect(err.message).toBe('test cache error');
    });

    test('NetworkError', () => {
        const err = new NetworkError('test network error');
        expect(err.name).toBe('NetworkError');
        expect(err.message).toBe('test network error');
    });
});
