import { describe, it, expect } from 'vitest';
import { extractCwdFromJsonl } from './extractCwdFromJsonl';

describe('extractCwdFromJsonl', () => {
  it('extracts cwd from JSONL with cwd on first line', () => {
    const content = '{"cwd": "/path/to/project"}\n{"message": "hello"}';
    expect(extractCwdFromJsonl(content)).toBe('/path/to/project');
  });

  it('extracts cwd from JSONL with cwd on a later line', () => {
    const content = '{"type": "init"}\n{"cwd": "/another/path"}\n{"data": "test"}';
    expect(extractCwdFromJsonl(content)).toBe('/another/path');
  });

  it('returns null for empty content', () => {
    expect(extractCwdFromJsonl('')).toBeNull();
  });

  it('returns null for whitespace-only content', () => {
    expect(extractCwdFromJsonl('   \n  \n  ')).toBeNull();
  });

  it('returns null for content without cwd field', () => {
    const content = '{"type": "message"}\n{"data": "test"}';
    expect(extractCwdFromJsonl(content)).toBeNull();
  });

  it('returns null for malformed JSON content', () => {
    const content = 'not json at all\n{broken json';
    expect(extractCwdFromJsonl(content)).toBeNull();
  });

  it('handles mix of valid and invalid JSON lines', () => {
    const content = '{broken\n{"cwd": "/valid/path"}\nmore broken';
    expect(extractCwdFromJsonl(content)).toBe('/valid/path');
  });

  it('returns first cwd found when multiple exist', () => {
    const content = '{"cwd": "/first/path"}\n{"cwd": "/second/path"}';
    expect(extractCwdFromJsonl(content)).toBe('/first/path');
  });

  it('handles cwd with special characters in path', () => {
    const content = '{"cwd": "/path/with spaces/and-dashes/and_underscores"}';
    expect(extractCwdFromJsonl(content)).toBe('/path/with spaces/and-dashes/and_underscores');
  });

  it('returns null when cwd field is null', () => {
    const content = '{"cwd": null}';
    expect(extractCwdFromJsonl(content)).toBeNull();
  });

  it('returns null when cwd field is not a string', () => {
    const content = '{"cwd": 123}';
    expect(extractCwdFromJsonl(content)).toBeNull();
  });

  it('handles Windows-style paths', () => {
    const content = '{"cwd": "C:\\\\Users\\\\test\\\\project"}';
    expect(extractCwdFromJsonl(content)).toBe('C:\\Users\\test\\project');
  });
});
