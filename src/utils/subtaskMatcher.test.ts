import { describe, it, expect } from 'vitest';
import { parseChildSessionTitle, findSpawnedSession, getSpawnedSessionId } from './subtaskMatcher';
import type { SubtaskPart, SessionInfo } from '../types/session';

// Helper to create mock SessionInfo
const createMockSession = (id: string, title: string, parentID?: string): SessionInfo => ({
  id,
  version: '1.0',
  projectID: 'test-project',
  directory: '/test',
  title,
  parentID,
  time: { created: Date.now(), updated: Date.now() },
});

// Helper to create mock sessions record
const createSessionsRecord = (...sessions: SessionInfo[]): Record<string, SessionInfo> => {
  const record: Record<string, SessionInfo> = {};
  for (const session of sessions) {
    record[session.id] = session;
  }
  return record;
};

// Helper to create mock SubtaskPart
const createMockSubtask = (agent: string, description: string): SubtaskPart => ({
  id: 'prt-test',
  sessionID: 'ses-test',
  messageID: 'msg-test',
  type: 'subtask',
  prompt: 'test prompt',
  description,
  agent,
});

describe('subtaskMatcher', () => {
  describe('parseChildSessionTitle', () => {
    it('parses valid child session title', () => {
      const result = parseChildSessionTitle('Review bug fix changes (@code-reviewer subagent)');
      expect(result).toEqual({
        agent: 'code-reviewer',
        description: 'Review bug fix changes',
      });
    });

    it('parses title with simple agent name', () => {
      const result = parseChildSessionTitle('Explore session storage (@explore subagent)');
      expect(result).toEqual({
        agent: 'explore',
        description: 'Explore session storage',
      });
    });

    it('parses title with general agent', () => {
      const result = parseChildSessionTitle('Validate compatibility-checker skill structure (@general subagent)');
      expect(result).toEqual({
        agent: 'general',
        description: 'Validate compatibility-checker skill structure',
      });
    });

    it('returns null for non-matching title', () => {
      expect(parseChildSessionTitle('Regular session title')).toBeNull();
      expect(parseChildSessionTitle('Session without subagent tag')).toBeNull();
      expect(parseChildSessionTitle('')).toBeNull();
    });

    it('is case-insensitive for subagent keyword', () => {
      const result = parseChildSessionTitle('Task (@explore SUBAGENT)');
      expect(result).toEqual({
        agent: 'explore',
        description: 'Task',
      });
    });
  });

  describe('findSpawnedSession', () => {
    it('finds matching session by agent and description', () => {
      const subtask = createMockSubtask('code-reviewer', 'Review changes');
      const sessions = createSessionsRecord(
        createMockSession('child-1', 'Review changes (@code-reviewer subagent)', 'parent'),
        createMockSession('child-2', 'Other task (@explore subagent)', 'parent'),
      );

      const result = findSpawnedSession(subtask, sessions);
      expect(result?.id).toBe('child-1');
    });

    it('matches case-insensitively', () => {
      const subtask = createMockSubtask('CODE-REVIEWER', 'REVIEW CHANGES');
      const sessions = createSessionsRecord(
        createMockSession('child-1', 'review changes (@code-reviewer subagent)', 'parent'),
      );

      const result = findSpawnedSession(subtask, sessions);
      expect(result?.id).toBe('child-1');
    });

    it('matches when child description starts with subtask description', () => {
      const subtask = createMockSubtask('explore', 'Explore');
      const sessions = createSessionsRecord(
        createMockSession('child-1', 'Explore session storage (@explore subagent)', 'parent'),
      );

      const result = findSpawnedSession(subtask, sessions);
      expect(result?.id).toBe('child-1');
    });

    it('matches when subtask description starts with child description', () => {
      const subtask = createMockSubtask('explore', 'Explore session storage and more');
      const sessions = createSessionsRecord(
        createMockSession('child-1', 'Explore session storage (@explore subagent)', 'parent'),
      );

      const result = findSpawnedSession(subtask, sessions);
      expect(result?.id).toBe('child-1');
    });

    it('returns undefined when no match', () => {
      const subtask = createMockSubtask('code-reviewer', 'Review changes');
      const sessions = createSessionsRecord(
        createMockSession('child-1', 'Different task (@explore subagent)', 'parent'),
      );

      const result = findSpawnedSession(subtask, sessions);
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty sessions record', () => {
      const subtask = createMockSubtask('explore', 'Task');
      const result = findSpawnedSession(subtask, {});
      expect(result).toBeUndefined();
    });

    it('skips sessions without subagent pattern in title', () => {
      const subtask = createMockSubtask('explore', 'Task');
      const sessions = createSessionsRecord(
        createMockSession('child-1', 'Regular session title', 'parent'),
      );

      const result = findSpawnedSession(subtask, sessions);
      expect(result).toBeUndefined();
    });
  });

  describe('getSpawnedSessionId', () => {
    it('returns session ID when match found', () => {
      const subtask = createMockSubtask('explore', 'Find files');
      const sessions = createSessionsRecord(
        createMockSession('child-123', 'Find files (@explore subagent)', 'parent'),
      );

      const result = getSpawnedSessionId(subtask, sessions);
      expect(result).toBe('child-123');
    });

    it('returns undefined when no match', () => {
      const subtask = createMockSubtask('explore', 'Find files');
      const result = getSpawnedSessionId(subtask, {});
      expect(result).toBeUndefined();
    });
  });
});
