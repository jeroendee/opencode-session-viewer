import { describe, it, expect } from 'vitest';
import { calculateTotals, calculateMessageTotals } from './calculateTotals';
import type { Session, Message } from '../types/session';

function createTestSession(): Session {
  return {
    info: {
      id: 'ses_test',
      version: '1.0.0',
      projectID: 'test',
      directory: '/test',
      title: 'Test Session',
      time: {
        created: 1000,
        updated: 5000,
      },
    },
    messages: [
      {
        info: {
          id: 'msg_1',
          sessionID: 'ses_test',
          role: 'user',
          time: { created: 1000 },
          agent: 'test',
          model: { providerID: 'test', modelID: 'test' },
        },
        parts: [],
      },
      {
        info: {
          id: 'msg_2',
          sessionID: 'ses_test',
          role: 'assistant',
          parentID: 'msg_1',
          time: { created: 2000, completed: 3000 },
          modelID: 'test',
          providerID: 'test',
          agent: 'test',
          mode: 'test',
          path: { cwd: '/', root: '/' },
          cost: 0.05,
          tokens: {
            input: 1000,
            output: 500,
            reasoning: 100,
            cache: { read: 200, write: 50 },
          },
        },
        parts: [],
      },
      {
        info: {
          id: 'msg_3',
          sessionID: 'ses_test',
          role: 'assistant',
          parentID: 'msg_1',
          time: { created: 3000, completed: 4000 },
          modelID: 'test',
          providerID: 'test',
          agent: 'test',
          mode: 'test',
          path: { cwd: '/', root: '/' },
          cost: 0.03,
          tokens: {
            input: 500,
            output: 300,
            reasoning: 50,
            cache: { read: 100, write: 25 },
          },
        },
        parts: [],
      },
    ],
  };
}

describe('calculateTotals', () => {
  it('sums cost from all assistant messages', () => {
    const session = createTestSession();
    const totals = calculateTotals(session);

    expect(totals.cost).toBe(0.08); // 0.05 + 0.03
  });

  it('sums tokens correctly', () => {
    const session = createTestSession();
    const totals = calculateTotals(session);

    expect(totals.tokens.input).toBe(1500); // 1000 + 500
    expect(totals.tokens.output).toBe(800); // 500 + 300
    expect(totals.tokens.reasoning).toBe(150); // 100 + 50
    expect(totals.tokens.cacheRead).toBe(300); // 200 + 100
    expect(totals.tokens.cacheWrite).toBe(75); // 50 + 25
    expect(totals.tokens.total).toBe(2450); // 1500 + 800 + 150
  });

  it('calculates duration correctly', () => {
    const session = createTestSession();
    const totals = calculateTotals(session);

    expect(totals.duration.start).toBe(1000);
    expect(totals.duration.end).toBe(5000); // from session.info.time.updated
    expect(totals.duration.durationMs).toBe(4000);
  });

  it('counts messages correctly', () => {
    const session = createTestSession();
    const totals = calculateTotals(session);

    expect(totals.messageCount.user).toBe(1);
    expect(totals.messageCount.assistant).toBe(2);
    expect(totals.messageCount.total).toBe(3);
  });

  it('handles empty session', () => {
    const session: Session = {
      info: {
        id: 'ses_empty',
        version: '1.0.0',
        projectID: 'test',
        directory: '/test',
        title: 'Empty Session',
        time: { created: 1000, updated: 1000 },
      },
      messages: [],
    };

    const totals = calculateTotals(session);

    expect(totals.cost).toBe(0);
    expect(totals.tokens.total).toBe(0);
    expect(totals.messageCount.total).toBe(0);
  });
});

describe('calculateMessageTotals', () => {
  it('calculates totals for a subset of messages', () => {
    const messages: Message[] = [
      {
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
          cost: 0.02,
          tokens: {
            input: 100,
            output: 50,
            reasoning: 10,
            cache: { read: 20, write: 5 },
          },
        },
        parts: [],
      },
    ];

    const totals = calculateMessageTotals(messages);

    expect(totals.cost).toBe(0.02);
    expect(totals.tokens.input).toBe(100);
    expect(totals.tokens.output).toBe(50);
    expect(totals.messageCount.assistant).toBe(1);
    expect(totals.messageCount.user).toBe(0);
  });
});
