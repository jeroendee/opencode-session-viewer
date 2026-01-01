import { describe, it, expect } from 'vitest';
import { groupMessages, getGroupSummary, getAssistantStats } from './groupMessages';
import type { Message, UserMessage, AssistantMessage } from '../types/session';

// Helper to create test messages
function createUserMessage(id: string, text: string): UserMessage {
  return {
    info: {
      id,
      sessionID: 'ses_test',
      role: 'user',
      time: { created: Date.now() },
      agent: 'test',
      model: { providerID: 'test', modelID: 'test' },
    },
    parts: [
      {
        id: `prt_${id}`,
        sessionID: 'ses_test',
        messageID: id,
        type: 'text',
        text,
      },
    ],
  };
}

function createAssistantMessage(id: string, parentID: string, created: number): AssistantMessage {
  return {
    info: {
      id,
      sessionID: 'ses_test',
      role: 'assistant',
      parentID,
      time: { created, completed: created + 1000 },
      modelID: 'test',
      providerID: 'test',
      agent: 'test',
      mode: 'test',
      path: { cwd: '/', root: '/' },
      cost: 0.01,
      tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } },
    },
    parts: [
      {
        id: `prt_${id}_start`,
        sessionID: 'ses_test',
        messageID: id,
        type: 'step-start',
      },
      {
        id: `prt_${id}_text`,
        sessionID: 'ses_test',
        messageID: id,
        type: 'text',
        text: 'Response',
      },
      {
        id: `prt_${id}_finish`,
        sessionID: 'ses_test',
        messageID: id,
        type: 'step-finish',
        reason: 'stop',
        cost: 0.01,
        tokens: { input: 100, output: 50, reasoning: 0, cache: { read: 0, write: 0 } },
      },
    ],
  };
}

describe('groupMessages', () => {
  it('groups a single user message with its assistant response', () => {
    const messages: Message[] = [
      createUserMessage('msg_1', 'Hello'),
      createAssistantMessage('msg_2', 'msg_1', 1000),
    ];

    const groups = groupMessages(messages);

    expect(groups).toHaveLength(1);
    expect(groups[0].userMessage.info.id).toBe('msg_1');
    expect(groups[0].assistantMessages).toHaveLength(1);
    expect(groups[0].assistantMessages[0].info.id).toBe('msg_2');
  });

  it('groups multiple assistant messages with the same parent', () => {
    const messages: Message[] = [
      createUserMessage('msg_1', 'Hello'),
      createAssistantMessage('msg_2', 'msg_1', 1000),
      createAssistantMessage('msg_3', 'msg_1', 2000),
      createAssistantMessage('msg_4', 'msg_1', 3000),
    ];

    const groups = groupMessages(messages);

    expect(groups).toHaveLength(1);
    expect(groups[0].assistantMessages).toHaveLength(3);
    // Should be sorted by creation time
    expect(groups[0].assistantMessages[0].info.id).toBe('msg_2');
    expect(groups[0].assistantMessages[1].info.id).toBe('msg_3');
    expect(groups[0].assistantMessages[2].info.id).toBe('msg_4');
  });

  it('creates separate groups for different user messages', () => {
    const messages: Message[] = [
      createUserMessage('msg_1', 'First question'),
      createAssistantMessage('msg_2', 'msg_1', 1000),
      createUserMessage('msg_3', 'Second question'),
      createAssistantMessage('msg_4', 'msg_3', 2000),
    ];

    const groups = groupMessages(messages);

    expect(groups).toHaveLength(2);
    expect(groups[0].userMessage.info.id).toBe('msg_1');
    expect(groups[0].assistantMessages[0].info.id).toBe('msg_2');
    expect(groups[1].userMessage.info.id).toBe('msg_3');
    expect(groups[1].assistantMessages[0].info.id).toBe('msg_4');
  });

  it('handles user message with no assistant responses', () => {
    const messages: Message[] = [
      createUserMessage('msg_1', 'Hello'),
    ];

    const groups = groupMessages(messages);

    expect(groups).toHaveLength(1);
    expect(groups[0].userMessage.info.id).toBe('msg_1');
    expect(groups[0].assistantMessages).toHaveLength(0);
  });
});

describe('getGroupSummary', () => {
  it('returns summary title if available', () => {
    const userMessage: UserMessage = {
      info: {
        id: 'msg_1',
        sessionID: 'ses_test',
        role: 'user',
        time: { created: Date.now() },
        summary: { title: 'Custom Summary', diffs: [] },
        agent: 'test',
        model: { providerID: 'test', modelID: 'test' },
      },
      parts: [{ id: 'prt_1', sessionID: 'ses_test', messageID: 'msg_1', type: 'text', text: 'Some long text here' }],
    };

    const summary = getGroupSummary({ userMessage, assistantMessages: [] });
    expect(summary).toBe('Custom Summary');
  });

  it('truncates long text to 50 chars', () => {
    const longText = 'This is a very long message that should be truncated because it exceeds fifty characters';
    const userMessage = createUserMessage('msg_1', longText);

    const summary = getGroupSummary({ userMessage, assistantMessages: [] });
    expect(summary).toHaveLength(50);
    expect(summary).toMatch(/\.\.\.$/);
  });

  it('returns short text unchanged', () => {
    const userMessage = createUserMessage('msg_1', 'Short text');

    const summary = getGroupSummary({ userMessage, assistantMessages: [] });
    expect(summary).toBe('Short text');
  });
});

describe('getAssistantStats', () => {
  it('counts steps and tools', () => {
    const assistantMessage: AssistantMessage = {
      info: {
        id: 'msg_1',
        sessionID: 'ses_test',
        role: 'assistant',
        parentID: 'msg_0',
        time: { created: 1000 },
        modelID: 'test',
        providerID: 'test',
        agent: 'test',
        mode: 'test',
        path: { cwd: '/', root: '/' },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      },
      parts: [
        { id: 'p1', sessionID: 's', messageID: 'm', type: 'step-start' },
        { id: 'p2', sessionID: 's', messageID: 'm', type: 'tool', callID: 'c1', tool: 'bash', state: { status: 'completed', input: {}, output: '', title: '', time: { start: 0, end: 0 } } },
        { id: 'p3', sessionID: 's', messageID: 'm', type: 'tool', callID: 'c2', tool: 'read', state: { status: 'completed', input: {}, output: '', title: '', time: { start: 0, end: 0 } } },
        { id: 'p4', sessionID: 's', messageID: 'm', type: 'step-finish', reason: 'stop', cost: 0, tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } } },
      ],
    };

    const stats = getAssistantStats([assistantMessage]);

    expect(stats.stepCount).toBe(1);
    expect(stats.toolCount).toBe(2);
    expect(stats.hasReasoning).toBe(false);
  });

  it('detects reasoning parts', () => {
    const assistantMessage: AssistantMessage = {
      info: {
        id: 'msg_1',
        sessionID: 'ses_test',
        role: 'assistant',
        parentID: 'msg_0',
        time: { created: 1000 },
        modelID: 'test',
        providerID: 'test',
        agent: 'test',
        mode: 'test',
        path: { cwd: '/', root: '/' },
        cost: 0,
        tokens: { input: 0, output: 0, reasoning: 0, cache: { read: 0, write: 0 } },
      },
      parts: [
        { id: 'p1', sessionID: 's', messageID: 'm', type: 'reasoning', text: 'Thinking...' },
      ],
    };

    const stats = getAssistantStats([assistantMessage]);

    expect(stats.hasReasoning).toBe(true);
  });
});
