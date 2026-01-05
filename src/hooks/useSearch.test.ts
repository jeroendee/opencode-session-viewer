import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSearch } from './useSearch';
import type { Session, Message, UserMessageInfo, AssistantMessageInfo, TextPart } from '../types/session';

// Helper to create a user message
function createUserMessage(id: string, text: string): Message {
  const info: UserMessageInfo = {
    id,
    sessionID: 'session-1',
    role: 'user',
    time: { created: Date.now() },
    agent: 'main',
    model: { providerID: 'test', modelID: 'test-model' },
  };
  const part: TextPart = {
    id: `${id}-part-1`,
    sessionID: 'session-1',
    messageID: id,
    type: 'text',
    text,
  };
  return { info, parts: [part] };
}

// Helper to create an assistant message
function createAssistantMessage(id: string, parentID: string, text: string): Message {
  const info: AssistantMessageInfo = {
    id,
    sessionID: 'session-1',
    role: 'assistant',
    parentID,
    time: { created: Date.now() },
    modelID: 'test-model',
    providerID: 'test',
    agent: 'main',
    mode: 'normal',
    path: { cwd: '/test', root: '/test' },
    cost: 0,
    tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
  };
  const part: TextPart = {
    id: `${id}-part-1`,
    sessionID: 'session-1',
    messageID: id,
    type: 'text',
    text,
  };
  return { info, parts: [part] };
}

// Helper to create an assistant message without parentID (simulates malformed data)
// Uses a minimal cast scope to test the fallback behavior
function createAssistantMessageWithoutParent(id: string, text: string): Message {
  const part: TextPart = {
    id: `${id}-part-1`,
    sessionID: 'session-1',
    messageID: id,
    type: 'text',
    text,
  };
  // Intentionally omit parentID to test fallback behavior
  // The cast is scoped to just the info object construction
  return {
    info: {
      id,
      sessionID: 'session-1',
      role: 'assistant',
      // parentID intentionally omitted
      time: { created: Date.now() },
      modelID: 'test-model',
      providerID: 'test',
      agent: 'main',
      mode: 'normal',
      path: { cwd: '/test', root: '/test' },
      cost: 0,
      tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
    } as AssistantMessageInfo,
    parts: [part],
  };
}

// Helper to create a session with messages
function createSession(messages: Message[]): Session {
  return {
    info: {
      id: 'session-1',
      version: '1.0.0',
      projectID: 'project-1',
      directory: '/test',
      title: 'Test Session',
      time: { created: Date.now(), updated: Date.now() },
    },
    messages,
  };
}

describe('useSearch', () => {
  describe('matchedMessageIds', () => {
    it('returns empty set when no search query', () => {
      const session = createSession([
        createUserMessage('user-1', 'Hello world'),
      ]);

      const { result } = renderHook(() => useSearch(session));

      expect(result.current.matchedMessageIds.size).toBe(0);
    });

    it('returns user message ID when match is in user message', () => {
      const session = createSession([
        createUserMessage('user-1', 'Hello world'),
      ]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('hello');
      });

      expect(result.current.matchedMessageIds.has('user-1')).toBe(true);
      expect(result.current.matchedMessageIds.size).toBe(1);
    });

    it('returns user message ID (parentID) when match is in assistant message', () => {
      const userMsg = createUserMessage('user-1', 'What is React?');
      const assistantMsg = createAssistantMessage('assistant-1', 'user-1', 'React is a JavaScript library for building user interfaces.');
      const session = createSession([userMsg, assistantMsg]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('JavaScript');
      });

      // Should return the user message ID, not the assistant message ID
      expect(result.current.matchedMessageIds.has('user-1')).toBe(true);
      expect(result.current.matchedMessageIds.has('assistant-1')).toBe(false);
      expect(result.current.matchedMessageIds.size).toBe(1);
    });

    it('returns correct user message ID for multiple conversation turns', () => {
      const user1 = createUserMessage('user-1', 'Hello');
      const assistant1 = createAssistantMessage('assistant-1', 'user-1', 'Hi there!');
      const user2 = createUserMessage('user-2', 'Tell me about TypeScript');
      const assistant2 = createAssistantMessage('assistant-2', 'user-2', 'TypeScript is a typed superset of JavaScript.');
      const session = createSession([user1, assistant1, user2, assistant2]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('TypeScript');
      });

      // Match in user-2's text and assistant-2's response, both should map to user-2
      expect(result.current.matchedMessageIds.has('user-2')).toBe(true);
      expect(result.current.matchedMessageIds.has('user-1')).toBe(false);
      expect(result.current.matchedMessageIds.has('assistant-2')).toBe(false);
    });

    it('returns multiple user message IDs when matches span multiple conversations', () => {
      const user1 = createUserMessage('user-1', 'Hello world');
      const assistant1 = createAssistantMessage('assistant-1', 'user-1', 'Hi!');
      const user2 = createUserMessage('user-2', 'Goodbye world');
      const assistant2 = createAssistantMessage('assistant-2', 'user-2', 'Bye!');
      const session = createSession([user1, assistant1, user2, assistant2]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('world');
      });

      // Both user messages contain "world"
      expect(result.current.matchedMessageIds.has('user-1')).toBe(true);
      expect(result.current.matchedMessageIds.has('user-2')).toBe(true);
      expect(result.current.matchedMessageIds.size).toBe(2);
    });

    it('falls back to assistant message ID when parentID is missing', () => {
      // Use helper that creates assistant message without parentID
      const assistantWithoutParent = createAssistantMessageWithoutParent(
        'orphan-assistant',
        'Orphan response with keyword'
      );
      const session = createSession([assistantWithoutParent]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('keyword');
      });

      // Should fall back to the assistant message's own ID
      expect(result.current.matchedMessageIds.has('orphan-assistant')).toBe(true);
      expect(result.current.matchedMessageIds.has('undefined')).toBe(false);
      expect(result.current.matchedMessageIds.size).toBe(1);
    });
  });

  describe('searchResults', () => {
    it('uses user message ID (parentID) in results for assistant messages', () => {
      const userMsg = createUserMessage('user-1', 'What is React?');
      const assistantMsg = createAssistantMessage('assistant-1', 'user-1', 'React is a library.');
      const session = createSession([userMsg, assistantMsg]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('library');
      });

      expect(result.current.searchResults.length).toBe(1);
      expect(result.current.searchResults[0].messageId).toBe('user-1');
      expect(result.current.searchResults[0].type).toBe('assistant');
    });

    it('returns correct part ID regardless of message ID mapping', () => {
      const userMsg = createUserMessage('user-1', 'Question');
      const assistantMsg = createAssistantMessage('assistant-1', 'user-1', 'Answer with special term');
      const session = createSession([userMsg, assistantMsg]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('special');
      });

      expect(result.current.searchResults.length).toBe(1);
      // messageId should be the parent (user-1), but partId should be the actual part
      expect(result.current.searchResults[0].messageId).toBe('user-1');
      expect(result.current.searchResults[0].partId).toBe('assistant-1-part-1');
    });
  });

  describe('clearSearch', () => {
    it('clears search query and results', () => {
      const session = createSession([
        createUserMessage('user-1', 'Hello world'),
      ]);

      const { result } = renderHook(() => useSearch(session));

      act(() => {
        result.current.setSearchQuery('hello');
      });

      expect(result.current.searchResults.length).toBe(1);

      act(() => {
        result.current.clearSearch();
      });

      expect(result.current.searchQuery).toBe('');
      expect(result.current.searchResults.length).toBe(0);
      expect(result.current.matchedMessageIds.size).toBe(0);
    });
  });
});
