import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  parseDateQuery,
  searchSessions,
  useSessionSearch,
} from './useSessionSearch';
import type { SessionInfo } from '../types/session';

// Helper to create mock SessionInfo
const createMockSession = (
  id: string,
  title: string,
  createdTimestamp?: number,
  summary?: { additions: number; deletions: number; files: number; diffs?: string[] },
  userMessages?: string[]
): SessionInfo => ({
  id,
  version: '1.0.0',
  projectID: 'project-1',
  directory: '/Users/test/project',
  title,
  time: {
    created: createdTimestamp ?? Date.now(),
    updated: createdTimestamp ?? Date.now(),
  },
  summary,
  userMessages,
});

describe('parseDateQuery', () => {
  // Use a fixed date for consistent testing
  const mockNow = new Date('2025-01-05T12:00:00Z');

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('today', () => {
    it('returns start and end of today', () => {
      const result = parseDateQuery('today');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      const endDate = new Date(result!.end);

      expect(startDate.getDate()).toBe(5);
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);

      expect(endDate.getDate()).toBe(5);
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
    });

    it('is case-insensitive', () => {
      expect(parseDateQuery('TODAY')).not.toBeNull();
      expect(parseDateQuery('Today')).not.toBeNull();
    });
  });

  describe('yesterday', () => {
    it('returns start and end of yesterday', () => {
      const result = parseDateQuery('yesterday');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      const endDate = new Date(result!.end);

      expect(startDate.getDate()).toBe(4);
      expect(endDate.getDate()).toBe(4);
    });
  });

  describe('last week', () => {
    it('returns past 7 days', () => {
      const result = parseDateQuery('last week');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      const endDate = new Date(result!.end);

      // Should start Dec 29, 2024 (7 days ago from Jan 5)
      expect(startDate.getMonth()).toBe(11); // December
      expect(startDate.getDate()).toBe(29);

      // Should end today
      expect(endDate.getDate()).toBe(5);
      expect(endDate.getMonth()).toBe(0); // January
    });
  });

  describe('this month', () => {
    it('returns start of month to now', () => {
      const result = parseDateQuery('this month');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      const endDate = new Date(result!.end);

      expect(startDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(0); // January

      expect(endDate.getDate()).toBe(5);
    });
  });

  describe('ISO format', () => {
    it('parses YYYY-MM-DD format', () => {
      const result = parseDateQuery('2025-01-03');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      expect(startDate.getFullYear()).toBe(2025);
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(3);
    });

    it('returns null for invalid ISO dates', () => {
      expect(parseDateQuery('2025-13-01')).toBeNull(); // Invalid month
      expect(parseDateQuery('2025-1-1')).toBeNull(); // Wrong format (needs leading zeros)
    });
  });

  describe('month name and day', () => {
    it('parses "jan 3" format', () => {
      const result = parseDateQuery('jan 3');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(3);
    });

    it('parses full month names', () => {
      const result = parseDateQuery('january 3');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      expect(startDate.getMonth()).toBe(0);
      expect(startDate.getDate()).toBe(3);
    });

    it('parses two-digit days', () => {
      const result = parseDateQuery('jan 15');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      expect(startDate.getDate()).toBe(15);
    });

    it('uses previous year for future dates', () => {
      // Current date is Jan 5, 2025
      // "dec 25" should resolve to Dec 25, 2024 (not 2025)
      const result = parseDateQuery('dec 25');
      expect(result).not.toBeNull();

      const startDate = new Date(result!.start);
      expect(startDate.getFullYear()).toBe(2024);
      expect(startDate.getMonth()).toBe(11);
      expect(startDate.getDate()).toBe(25);
    });

    it('is case-insensitive', () => {
      expect(parseDateQuery('JAN 3')).not.toBeNull();
      expect(parseDateQuery('January 3')).not.toBeNull();
    });

    it('returns null for invalid month-day combinations', () => {
      expect(parseDateQuery('feb 30')).toBeNull(); // Feb never has 30 days
      expect(parseDateQuery('feb 31')).toBeNull(); // Feb never has 31 days
      expect(parseDateQuery('apr 31')).toBeNull(); // April only has 30 days
      expect(parseDateQuery('jun 31')).toBeNull(); // June only has 30 days
      expect(parseDateQuery('sep 31')).toBeNull(); // September only has 30 days
      expect(parseDateQuery('nov 31')).toBeNull(); // November only has 30 days
    });
  });

  describe('non-date queries', () => {
    it('returns null for regular text', () => {
      expect(parseDateQuery('hello world')).toBeNull();
      expect(parseDateQuery('fix bug')).toBeNull();
      expect(parseDateQuery('refactor')).toBeNull();
    });

    it('returns null for partial matches', () => {
      expect(parseDateQuery('today is good')).toBeNull();
      expect(parseDateQuery('not yesterday')).toBeNull();
    });
  });
});

describe('searchSessions', () => {
  const mockSessions: Record<string, SessionInfo> = {
    'session-1': createMockSession('session-1', 'Fix authentication bug'),
    'session-2': createMockSession('session-2', 'Add user profile feature'),
    'session-3': createMockSession('session-3', 'Refactor database layer', undefined, {
      additions: 100,
      deletions: 50,
      files: 5,
      diffs: ['Modified user.ts', 'Updated database connection'],
    }),
  };

  describe('title search', () => {
    it('finds sessions by title (case-insensitive)', () => {
      const results = searchSessions('authentication', mockSessions);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-1');
      expect(results[0].matchType).toBe('title');
    });

    it('finds partial matches', () => {
      const results = searchSessions('auth', mockSessions);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-1');
    });

    it('is case-insensitive', () => {
      const results = searchSessions('AUTHENTICATION', mockSessions);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-1');
    });

    it('returns empty for no matches', () => {
      const results = searchSessions('nonexistent', mockSessions);

      expect(results).toHaveLength(0);
    });

    it('returns empty for empty query', () => {
      const results = searchSessions('', mockSessions);

      expect(results).toHaveLength(0);
    });

    it('returns empty for whitespace query', () => {
      const results = searchSessions('   ', mockSessions);

      expect(results).toHaveLength(0);
    });
  });

  describe('summary search', () => {
    it('finds sessions by summary diffs', () => {
      const results = searchSessions('database connection', mockSessions);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-3');
      expect(results[0].matchType).toBe('summary');
    });

    it('prefers title match over summary match', () => {
      // "database" appears in session-3 title and summary
      const sessionsWithOverlap: Record<string, SessionInfo> = {
        'session-overlap': createMockSession('session-overlap', 'Database migration', undefined, {
          additions: 10,
          deletions: 5,
          files: 1,
          diffs: ['Also mentions database'],
        }),
      };

      const results = searchSessions('database', sessionsWithOverlap);

      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe('title');
    });
  });

  describe('message search', () => {
    it('does not search messages by default', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Some title',
          undefined,
          undefined,
          ['Help me fix the authentication bug']
        ),
      };

      const results = searchSessions('authentication', sessions);

      expect(results).toHaveLength(0);
    });

    it('finds sessions by message content when includeMessages is true', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Some title',
          undefined,
          undefined,
          ['Help me fix the authentication bug']
        ),
      };

      const results = searchSessions('authentication', sessions, { includeMessages: true });

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-1');
      expect(results[0].matchType).toBe('message');
    });

    it('is case-insensitive', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Some title',
          undefined,
          undefined,
          ['Help me fix the AUTHENTICATION bug']
        ),
      };

      const results = searchSessions('authentication', sessions, { includeMessages: true });

      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe('message');
    });

    it('searches through multiple messages', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Some title',
          undefined,
          undefined,
          ['First message', 'Second message with special keyword']
        ),
      };

      const results = searchSessions('special keyword', sessions, { includeMessages: true });

      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe('message');
    });

    it('prefers title match over message match', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Fix authentication issue',
          undefined,
          undefined,
          ['Also mentions authentication']
        ),
      };

      const results = searchSessions('authentication', sessions, { includeMessages: true });

      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe('title');
    });

    it('prefers summary match over message match', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Some title',
          undefined,
          { additions: 10, deletions: 5, files: 1, diffs: ['Fixed authentication'] },
          ['Also mentions authentication in message']
        ),
      };

      const results = searchSessions('authentication', sessions, { includeMessages: true });

      expect(results).toHaveLength(1);
      expect(results[0].matchType).toBe('summary');
    });

    it('ignores sessions without userMessages when includeMessages is true', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession('session-1', 'Some title'),
        'session-2': createMockSession(
          'session-2',
          'Another title',
          undefined,
          undefined,
          ['Has authentication content']
        ),
      };

      const results = searchSessions('authentication', sessions, { includeMessages: true });

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-2');
    });

    it('provides context in preview', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession(
          'session-1',
          'Some title',
          undefined,
          undefined,
          ['I need help fixing the authentication bug in the login form']
        ),
      };

      const results = searchSessions('authentication', sessions, { includeMessages: true });

      expect(results[0].preview).toContain('authentication');
      expect(results[0].matchText).toBe('authentication');
    });
  });

  describe('date search', () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2025-01-05T12:00:00Z'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('finds sessions by date', () => {
      const today = new Date('2025-01-05T10:00:00Z').getTime();
      const yesterday = new Date('2025-01-04T10:00:00Z').getTime();
      const lastWeek = new Date('2024-12-30T10:00:00Z').getTime();

      const sessions: Record<string, SessionInfo> = {
        'today-session': createMockSession('today-session', 'Today work', today),
        'yesterday-session': createMockSession('yesterday-session', 'Yesterday work', yesterday),
        'old-session': createMockSession('old-session', 'Old work', lastWeek),
      };

      const todayResults = searchSessions('today', sessions);
      expect(todayResults).toHaveLength(1);
      expect(todayResults[0].sessionId).toBe('today-session');
      expect(todayResults[0].matchType).toBe('date');

      const yesterdayResults = searchSessions('yesterday', sessions);
      expect(yesterdayResults).toHaveLength(1);
      expect(yesterdayResults[0].sessionId).toBe('yesterday-session');
    });

    it('finds multiple sessions for date range queries', () => {
      const today = new Date('2025-01-05T10:00:00Z').getTime();
      const twoDaysAgo = new Date('2025-01-03T10:00:00Z').getTime();
      const twoWeeksAgo = new Date('2024-12-22T10:00:00Z').getTime();

      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession('session-1', 'Today', today),
        'session-2': createMockSession('session-2', 'Recent', twoDaysAgo),
        'session-3': createMockSession('session-3', 'Old', twoWeeksAgo),
      };

      const lastWeekResults = searchSessions('last week', sessions);
      expect(lastWeekResults).toHaveLength(2); // Today and two days ago
    });
  });

  describe('result sorting', () => {
    it('sorts results by recency (most recent first)', () => {
      const older = new Date('2025-01-01T10:00:00Z').getTime();
      const newer = new Date('2025-01-03T10:00:00Z').getTime();

      const sessions: Record<string, SessionInfo> = {
        'old-session': createMockSession('old-session', 'Fix bug A', older),
        'new-session': createMockSession('new-session', 'Fix bug B', newer),
      };

      const results = searchSessions('Fix bug', sessions);

      expect(results).toHaveLength(2);
      expect(results[0].sessionId).toBe('new-session');
      expect(results[1].sessionId).toBe('old-session');
    });
  });

  describe('Map support', () => {
    it('works with Map<string, SessionInfo>', () => {
      const sessionsMap = new Map<string, SessionInfo>();
      sessionsMap.set('session-1', createMockSession('session-1', 'Fix authentication bug'));
      sessionsMap.set('session-2', createMockSession('session-2', 'Add feature'));

      const results = searchSessions('authentication', sessionsMap);

      expect(results).toHaveLength(1);
      expect(results[0].sessionId).toBe('session-1');
    });
  });

  describe('result preview', () => {
    it('includes context around match', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession('session-1', 'This is a very long title about fixing authentication issues'),
      };

      const results = searchSessions('authentication', sessions);

      expect(results[0].preview).toContain('authentication');
      expect(results[0].preview.length).toBeLessThan(sessions['session-1'].title.length + 10);
    });

    it('includes matched text', () => {
      const sessions: Record<string, SessionInfo> = {
        'session-1': createMockSession('session-1', 'Fix Authentication Bug'),
      };

      const results = searchSessions('auth', sessions);

      expect(results[0].matchText).toBe('Auth'); // Preserves original case
    });
  });
});

describe('useSessionSearch hook', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockSessions: Record<string, SessionInfo> = {
    'session-1': createMockSession('session-1', 'Fix authentication bug'),
    'session-2': createMockSession('session-2', 'Add user profile feature'),
  };

  it('returns initial state', () => {
    const { result } = renderHook(() => useSessionSearch(mockSessions));

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
    expect(result.current.isSearching).toBe(false);
  });

  it('updates query when setQuery is called', () => {
    const { result } = renderHook(() => useSessionSearch(mockSessions));

    act(() => {
      result.current.setQuery('auth');
    });

    expect(result.current.query).toBe('auth');
  });

  it('debounces search results', async () => {
    const { result } = renderHook(() => useSessionSearch(mockSessions));

    act(() => {
      result.current.setQuery('auth');
    });

    // Results should not be immediately available
    expect(result.current.results).toEqual([]);

    // Advance timers by 150ms (debounce delay)
    act(() => {
      vi.advanceTimersByTime(150);
    });

    // Now results should be available
    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].sessionId).toBe('session-1');
  });

  it('cancels pending search on new query', async () => {
    const { result } = renderHook(() => useSessionSearch(mockSessions));

    act(() => {
      result.current.setQuery('auth');
    });

    // Advance partially
    act(() => {
      vi.advanceTimersByTime(100);
    });

    // Change query
    act(() => {
      result.current.setQuery('user');
    });

    // Complete first timer (should be cancelled)
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.results).toEqual([]);

    // Complete second timer
    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].sessionId).toBe('session-2');
  });

  it('clears search with clearSearch', async () => {
    const { result } = renderHook(() => useSessionSearch(mockSessions));

    act(() => {
      result.current.setQuery('auth');
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.results).toHaveLength(1);

    act(() => {
      result.current.clearSearch();
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.query).toBe('');
    expect(result.current.results).toEqual([]);
  });

  it('isSearching is true when query has content', () => {
    const { result } = renderHook(() => useSessionSearch(mockSessions));

    act(() => {
      result.current.setQuery('auth');
    });

    expect(result.current.isSearching).toBe(true);

    act(() => {
      result.current.setQuery('   ');
    });

    expect(result.current.isSearching).toBe(false);
  });

  it('updates results when sessions change', async () => {
    const initialSessions: Record<string, SessionInfo> = {
      'session-1': createMockSession('session-1', 'Fix bug'),
    };

    const { result, rerender } = renderHook(
      ({ sessions }) => useSessionSearch(sessions),
      { initialProps: { sessions: initialSessions } }
    );

    act(() => {
      result.current.setQuery('auth');
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.results).toHaveLength(0);

    // Update sessions
    const newSessions: Record<string, SessionInfo> = {
      ...initialSessions,
      'session-2': createMockSession('session-2', 'Fix authentication'),
    };

    rerender({ sessions: newSessions });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.results).toHaveLength(1);
    expect(result.current.results[0].sessionId).toBe('session-2');
  });

  it('accepts Map as sessions parameter', async () => {
    const sessionsMap = new Map<string, SessionInfo>();
    sessionsMap.set('session-1', createMockSession('session-1', 'Fix authentication bug'));

    const { result } = renderHook(() => useSessionSearch(sessionsMap));

    act(() => {
      result.current.setQuery('auth');
    });

    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(result.current.results).toHaveLength(1);
  });

});

describe('performance', () => {
  it('searches 500 sessions correctly', () => {
    // Create 500 sessions
    const sessions: Record<string, SessionInfo> = {};
    for (let i = 0; i < 500; i++) {
      sessions[`session-${i}`] = createMockSession(
        `session-${i}`,
        `Session ${i} - ${i % 10 === 0 ? 'authentication' : 'feature'} work`,
        Date.now() - i * 1000
      );
    }

    const results = searchSessions('authentication', sessions);

    // Every 10th session has 'authentication' (i=0,10,20,...,490 = 50 sessions)
    expect(results.length).toBe(50);
    // Results should be sorted by recency (most recent first)
    expect(results[0].sessionId).toBe('session-0');
    expect(results[49].sessionId).toBe('session-490');
  });
});
