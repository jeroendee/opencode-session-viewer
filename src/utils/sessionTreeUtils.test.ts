import { describe, it, expect } from 'vitest';
import { findSessionNode, getChildSessions } from './sessionTreeUtils';
import type { SessionNode } from '../store/sessionStore';
import type { SessionInfo } from '../types/session';

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

// Helper to create mock SessionNode
const createMockNode = (
  id: string,
  title: string,
  children: SessionNode[] = [],
  parentID?: string
): SessionNode => ({
  session: createMockSession(id, title, parentID),
  children,
});

describe('sessionTreeUtils', () => {
  describe('findSessionNode', () => {
    it('finds a root-level session', () => {
      const nodes = [
        createMockNode('session-1', 'Session 1'),
        createMockNode('session-2', 'Session 2'),
      ];

      const result = findSessionNode(nodes, 'session-1');
      expect(result).toBeDefined();
      expect(result?.session.id).toBe('session-1');
    });

    it('finds a nested child session', () => {
      const child = createMockNode('child-1', 'Child Session', [], 'session-1');
      const parent = createMockNode('session-1', 'Parent Session', [child]);
      const nodes = [parent];

      const result = findSessionNode(nodes, 'child-1');
      expect(result).toBeDefined();
      expect(result?.session.id).toBe('child-1');
    });

    it('finds a deeply nested session', () => {
      const grandchild = createMockNode('grandchild', 'Grandchild', [], 'child');
      const child = createMockNode('child', 'Child', [grandchild], 'root');
      const root = createMockNode('root', 'Root', [child]);
      const nodes = [root];

      const result = findSessionNode(nodes, 'grandchild');
      expect(result).toBeDefined();
      expect(result?.session.id).toBe('grandchild');
    });

    it('returns undefined for non-existent session', () => {
      const nodes = [createMockNode('session-1', 'Session 1')];

      const result = findSessionNode(nodes, 'does-not-exist');
      expect(result).toBeUndefined();
    });

    it('returns undefined for empty node array', () => {
      const result = findSessionNode([], 'any-id');
      expect(result).toBeUndefined();
    });
  });

  describe('getChildSessions', () => {
    it('returns children for a session with children', () => {
      const child1 = createMockNode('child-1', 'Child 1', [], 'parent');
      const child2 = createMockNode('child-2', 'Child 2', [], 'parent');
      const parent = createMockNode('parent', 'Parent', [child1, child2]);
      const nodes = [parent];

      const result = getChildSessions(nodes, 'parent');
      expect(result).toHaveLength(2);
      expect(result[0].session.id).toBe('child-1');
      expect(result[1].session.id).toBe('child-2');
    });

    it('returns empty array for session without children', () => {
      const node = createMockNode('session', 'Session');
      const nodes = [node];

      const result = getChildSessions(nodes, 'session');
      expect(result).toEqual([]);
    });

    it('returns empty array for non-existent session', () => {
      const nodes = [createMockNode('session', 'Session')];

      const result = getChildSessions(nodes, 'does-not-exist');
      expect(result).toEqual([]);
    });

    it('returns children of nested session', () => {
      const grandchild = createMockNode('grandchild', 'Grandchild', [], 'child');
      const child = createMockNode('child', 'Child', [grandchild], 'root');
      const root = createMockNode('root', 'Root', [child]);
      const nodes = [root];

      const result = getChildSessions(nodes, 'child');
      expect(result).toHaveLength(1);
      expect(result[0].session.id).toBe('grandchild');
    });

    it('returns empty array for empty node array', () => {
      const result = getChildSessions([], 'any-id');
      expect(result).toEqual([]);
    });
  });
});
