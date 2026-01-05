import { describe, it, expect } from 'vitest';
import { StorageError, getErrorSuggestion, type StorageErrorCode } from './errors';

describe('StorageError', () => {
  it('creates error with message and code', () => {
    const error = new StorageError('Test message', 'PERMISSION_DENIED');

    expect(error.message).toBe('Test message');
    expect(error.code).toBe('PERMISSION_DENIED');
    expect(error.name).toBe('StorageError');
  });

  it('extends Error', () => {
    const error = new StorageError('Test', 'PARSE_ERROR');

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(StorageError);
  });

  describe('suggestion', () => {
    it('returns suggestion for PERMISSION_DENIED', () => {
      const error = new StorageError('Permission denied', 'PERMISSION_DENIED');

      expect(error.suggestion).toContain('Retry');
    });

    it('returns suggestion for NOT_STORAGE_FOLDER', () => {
      const error = new StorageError('Not a storage folder', 'NOT_STORAGE_FOLDER');

      expect(error.suggestion).toContain('storage');
    });

    it('returns suggestion for PARSE_ERROR', () => {
      const error = new StorageError('Parse error', 'PARSE_ERROR');

      expect(error.suggestion).toContain('corrupted');
    });

    it('returns suggestion for UNSUPPORTED_BROWSER', () => {
      const error = new StorageError('Unsupported', 'UNSUPPORTED_BROWSER');

      expect(error.suggestion).toContain('Chrome');
    });

    it('returns suggestion for EMPTY_FOLDER', () => {
      const error = new StorageError('Empty folder', 'EMPTY_FOLDER');

      expect(error.suggestion).toContain('sessions');
    });
  });

  describe('canRetry', () => {
    it('returns true for PERMISSION_DENIED', () => {
      const error = new StorageError('Permission denied', 'PERMISSION_DENIED');

      expect(error.canRetry).toBe(true);
    });

    it('returns false for other error codes', () => {
      const nonRetryableCodes: StorageErrorCode[] = [
        'NOT_STORAGE_FOLDER',
        'PARSE_ERROR',
        'UNSUPPORTED_BROWSER',
        'EMPTY_FOLDER',
      ];

      for (const code of nonRetryableCodes) {
        const error = new StorageError('Test', code);
        expect(error.canRetry).toBe(false);
      }
    });
  });
});

describe('getErrorSuggestion', () => {
  it('returns appropriate suggestions for all error codes', () => {
    const codes: StorageErrorCode[] = [
      'PERMISSION_DENIED',
      'NOT_STORAGE_FOLDER',
      'PARSE_ERROR',
      'UNSUPPORTED_BROWSER',
      'EMPTY_FOLDER',
    ];

    for (const code of codes) {
      const suggestion = getErrorSuggestion(code);
      expect(suggestion).toBeTruthy();
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    }
  });
});
