import { describe, it, expect } from 'vitest';
import {
  formatCost,
  formatTokens,
  formatDuration,
  formatDurationCompact,
  formatDate,
  formatFileChanges,
  truncate,
  buildSessionTooltip,
} from './formatters';

describe('formatCost', () => {
  it('formats zero as $0.00', () => {
    expect(formatCost(0)).toBe('$0.00');
  });

  it('formats small costs with 4 decimal places', () => {
    expect(formatCost(0.0001)).toBe('$0.0001');
    expect(formatCost(0.0099)).toBe('$0.0099');
  });

  it('formats larger costs with 2 decimal places', () => {
    expect(formatCost(0.01)).toBe('$0.01');
    expect(formatCost(1.5)).toBe('$1.50');
    expect(formatCost(10.99)).toBe('$10.99');
  });
});

describe('formatTokens', () => {
  it('formats small numbers as-is', () => {
    expect(formatTokens(0)).toBe('0');
    expect(formatTokens(500)).toBe('500');
    expect(formatTokens(999)).toBe('999');
  });

  it('formats thousands with k suffix', () => {
    expect(formatTokens(1000)).toBe('1.0k');
    expect(formatTokens(1500)).toBe('1.5k');
    expect(formatTokens(52800)).toBe('52.8k');
  });

  it('formats millions with M suffix', () => {
    expect(formatTokens(1000000)).toBe('1.0M');
    expect(formatTokens(1500000)).toBe('1.5M');
  });
});

describe('formatDuration', () => {
  it('handles zero duration', () => {
    expect(formatDuration(1000, 1000)).toBe('0s');
  });

  it('handles negative duration', () => {
    expect(formatDuration(2000, 1000)).toBe('0s');
  });

  it('formats seconds', () => {
    expect(formatDuration(0, 5000)).toBe('5s');
    expect(formatDuration(0, 30000)).toBe('30s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(0, 65000)).toBe('1m 5s');
    expect(formatDuration(0, 120000)).toBe('2m 0s');
  });

  it('formats hours', () => {
    expect(formatDuration(0, 3600000)).toBe('1h 0m');
    // Seconds are omitted when hours are present for cleaner display
    expect(formatDuration(0, 3661000)).toBe('1h 1m');
  });

  it('formats days', () => {
    expect(formatDuration(0, 86400000)).toBe('1d 0h 0m');
    // Seconds are omitted when days are present for cleaner display
    expect(formatDuration(0, 90061000)).toBe('1d 1h 1m');
  });
});

describe('formatDurationCompact', () => {
  it('formats milliseconds', () => {
    expect(formatDurationCompact(500)).toBe('500ms');
  });

  it('formats seconds', () => {
    expect(formatDurationCompact(5000)).toBe('5s');
  });

  it('formats minutes and seconds', () => {
    expect(formatDurationCompact(65000)).toBe('1m 5s');
    expect(formatDurationCompact(120000)).toBe('2m');
  });
});

describe('formatDate', () => {
  it('formats timestamp as readable date', () => {
    // Jan 1, 2024 12:30:00 UTC
    const timestamp = Date.UTC(2024, 0, 1, 12, 30, 0);
    const result = formatDate(timestamp);
    // Should contain month, day, year, and time
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/1/);
    expect(result).toMatch(/2024/);
  });
});

describe('formatFileChanges', () => {
  it('formats additions and deletions with file count', () => {
    expect(formatFileChanges({ additions: 10, deletions: 5, files: 3 }))
      .toBe('+10 -5 (3 files)');
  });

  it('handles single file', () => {
    expect(formatFileChanges({ additions: 1, deletions: 0, files: 1 }))
      .toBe('+1 (1 file)');
  });

  it('handles zero changes', () => {
    expect(formatFileChanges({ additions: 0, deletions: 0, files: 0 }))
      .toBe('0 files');
  });

  it('handles deletions only', () => {
    expect(formatFileChanges({ additions: 0, deletions: 5, files: 2 }))
      .toBe('-5 (2 files)');
  });
});

describe('truncate', () => {
  it('returns short text unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long text with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });
});

describe('buildSessionTooltip', () => {
  const createSession = (id: string, updated: number, title = '') => ({
    id,
    version: '1.0',
    projectID: 'proj-1',
    directory: '/test',
    title,
    time: { created: updated, updated },
  });

  it('builds tooltip with provided display title option', () => {
    const timestamp = Date.UTC(2024, 0, 1, 12, 30, 0);
    const session = createSession('session-123', timestamp, 'Original Title');
    const result = buildSessionTooltip(session, { displayTitle: 'My Session' });
    expect(result).toContain('My Session');
    expect(result).toContain('ID: session-123');
    expect(result).toMatch(/Jan.*1.*2024/);
  });

  it('uses session title when displayTitle option not provided', () => {
    const timestamp = Date.UTC(2024, 0, 1, 12, 30, 0);
    const session = createSession('session-456', timestamp, 'Session Title');
    const result = buildSessionTooltip(session);
    expect(result).toContain('Session Title');
    expect(result).toContain('ID: session-456');
  });

  it('uses default title when session has no title and no displayTitle option', () => {
    const timestamp = Date.UTC(2024, 0, 1, 12, 30, 0);
    const session = createSession('session-789', timestamp, '');
    const result = buildSessionTooltip(session);
    expect(result).toContain('Untitled Session');
    expect(result).toContain('ID: session-789');
  });

  it('formats tooltip with newlines', () => {
    const timestamp = Date.UTC(2024, 0, 1, 12, 30, 0);
    const session = createSession('test-id', timestamp, 'Test');
    const result = buildSessionTooltip(session);
    const lines = result.split('\n');
    expect(lines).toHaveLength(3);
    expect(lines[0]).toBe('Test');
    expect(lines[1]).toBe('ID: test-id');
  });
});
