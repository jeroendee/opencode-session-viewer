import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { parseClaudeJsonl, convertToSession, parseTimestamp } from './claudeParser';
import type { ClaudeTranscriptEntry } from '../types/claude';

describe('claudeParser', () => {
  describe('parseClaudeJsonl', () => {
    it('parses single user message line', () => {
      const jsonl = '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}';

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('user');
      expect(result[0].message.content[0]).toEqual({ type: 'text', text: 'Hello' });
    });

    it('parses single assistant message line', () => {
      const jsonl = '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi there!"}]},"usage":{"input_tokens":10,"output_tokens":5}}';

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe('assistant');
      expect(result[0].message.content[0]).toEqual({ type: 'text', text: 'Hi there!' });
    });

    it('parses multiple JSONL lines into array', () => {
      const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}`;

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('user');
      expect(result[1].type).toBe('assistant');
    });

    it('skips empty lines', () => {
      const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}

{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}
`;

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(2);
    });

    it('throws on malformed JSON line', () => {
      const jsonl = 'not valid json';

      expect(() => parseClaudeJsonl(jsonl)).toThrow();
    });

    it('skips file_history_snapshot entries', () => {
      const jsonl = '{"type":"file_history_snapshot","snapshot":{"file.ts":"content"}}';

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(0);
    });

    it('skips system entries', () => {
      const jsonl = '{"type":"system","message":{"content":"System message"}}';

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(0);
    });

    it('filters out non-message entries from mixed JSONL', () => {
      const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}
{"type":"file_history_snapshot","snapshot":{"file.ts":"content"}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}
{"type":"system","message":{"content":"System info"}}`;

      const result = parseClaudeJsonl(jsonl);

      expect(result).toHaveLength(2);
      expect(result[0].type).toBe('user');
      expect(result[1].type).toBe('assistant');
    });

    describe('isMeta filtering', () => {
      it('skips user messages where isMeta is true', () => {
        const jsonl = '{"type":"user","isMeta":true,"message":{"role":"user","content":[{"type":"text","text":"Meta message"}]}}';

        const result = parseClaudeJsonl(jsonl);

        expect(result).toHaveLength(0);
      });

      it('keeps user messages where isMeta is false', () => {
        const jsonl = '{"type":"user","isMeta":false,"message":{"role":"user","content":[{"type":"text","text":"Regular message"}]}}';

        const result = parseClaudeJsonl(jsonl);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('user');
      });

      it('keeps user messages where isMeta is undefined', () => {
        const jsonl = '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"No isMeta field"}]}}';

        const result = parseClaudeJsonl(jsonl);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('user');
      });

      it('keeps assistant messages regardless of isMeta', () => {
        const jsonl = '{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Response"}]}}';

        const result = parseClaudeJsonl(jsonl);

        expect(result).toHaveLength(1);
        expect(result[0].type).toBe('assistant');
      });

      it('filters isMeta user messages from mixed JSONL', () => {
        const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Real user message"}]}}
{"type":"user","isMeta":true,"message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"t1","content":"result"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Response"}]}}
{"type":"user","isMeta":true,"message":{"role":"user","content":[{"type":"text","text":"Another meta"}]}}
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Second real message"}]}}`;

        const result = parseClaudeJsonl(jsonl);

        expect(result).toHaveLength(3);
        expect(result[0].type).toBe('user');
        expect((result[0].message.content as Array<{text: string}>)[0].text).toBe('Real user message');
        expect(result[1].type).toBe('assistant');
        expect(result[2].type).toBe('user');
        expect((result[2].message.content as Array<{text: string}>)[0].text).toBe('Second real message');
      });
    });
  });

  describe('convertToSession', () => {
    it('converts user entry to normalized Message', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].info.role).toBe('user');
    });

    it('converts assistant entry to normalized Message', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hi there!' }],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages).toHaveLength(1);
      expect(session.messages[0].info.role).toBe('assistant');
    });

    it('handles text content blocks as TextPart', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Hello world' }],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].parts).toHaveLength(1);
      expect(session.messages[0].parts[0].type).toBe('text');
      expect((session.messages[0].parts[0] as { text: string }).text).toBe('Hello world');
    });

    it('converts user message with string content to TextPart', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: 'some string' as unknown as [],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].parts).toHaveLength(1);
      expect(session.messages[0].parts[0].type).toBe('text');
      expect((session.messages[0].parts[0] as { text: string }).text).toBe('some string');
    });

    it('handles tool_use content blocks as ToolPart', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              {
                type: 'tool_use',
                id: 'toolu_123',
                name: 'read_file',
                input: { path: '/test.txt' },
              },
            ],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].parts).toHaveLength(1);
      expect(session.messages[0].parts[0].type).toBe('tool');
      const toolPart = session.messages[0].parts[0] as { tool: string; callID: string };
      expect(toolPart.tool).toBe('read_file');
      expect(toolPart.callID).toBe('toolu_123');
    });

    it('extracts usage/token data from assistant messages', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
          },
          usage: {
            input_tokens: 100,
            output_tokens: 50,
            cache_read_input_tokens: 20,
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const info = session.messages[0].info;
      expect(info.role).toBe('assistant');
      if (info.role === 'assistant') {
        expect(info.tokens.input).toBe(100);
        expect(info.tokens.output).toBe(50);
        expect(info.tokens.cache.read).toBe(20);
      }
    });

    it('creates SessionInfo with placeholder metadata', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: {
            role: 'user',
            content: [{ type: 'text', text: 'Hello' }],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.id).toBe('test-session-id');
      expect(session.info.version).toBeDefined();
      expect(session.info.time.created).toBeDefined();
    });

    it('maintains message order from JSONL sequence', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'First' }] },
        },
        {
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Second' }] },
        },
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'Third' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages).toHaveLength(3);
      expect(session.messages[0].info.role).toBe('user');
      expect(session.messages[1].info.role).toBe('assistant');
      expect(session.messages[2].info.role).toBe('user');
    });

    it('links tool_result to corresponding tool_use via tool_use_id', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'toolu_123', name: 'read_file', input: { path: '/test.txt' } },
            ],
          },
        },
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_123', content: 'file contents here' },
            ],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      // The tool part should have the output from tool_result
      const toolPart = session.messages[0].parts[0] as {
        type: string;
        callID: string;
        state: { output: string };
      };
      expect(toolPart.type).toBe('tool');
      expect(toolPart.state.output).toBe('file contents here');
    });

    it('sets ToolPart error state when tool_result is_error is true', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'tool_use', id: 'toolu_456', name: 'execute', input: { cmd: 'bad' } },
            ],
          },
        },
        {
          type: 'user',
          message: {
            role: 'user',
            content: [
              { type: 'tool_result', tool_use_id: 'toolu_456', content: 'Command failed', is_error: true },
            ],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const toolPart = session.messages[0].parts[0] as {
        type: string;
        state: { status: string; error?: string };
      };
      expect(toolPart.type).toBe('tool');
      expect(toolPart.state.status).toBe('error');
      expect(toolPart.state.error).toBe('Command failed');
    });

    it('converts thinking blocks to ReasoningPart', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'Let me analyze this problem...', signature: 'sig123' },
            ],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].parts).toHaveLength(1);
      const reasoningPart = session.messages[0].parts[0] as { type: string; text: string };
      expect(reasoningPart.type).toBe('reasoning');
      expect(reasoningPart.text).toBe('Let me analyze this problem...');
    });

    it('handles thinking blocks mixed with text and tool_use', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [
              { type: 'thinking', thinking: 'First, I need to think...', signature: 'sig1' },
              { type: 'text', text: 'Here is my response.' },
              { type: 'tool_use', id: 'toolu_789', name: 'read_file', input: { path: '/test.txt' } },
            ],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].parts).toHaveLength(3);
      expect(session.messages[0].parts[0].type).toBe('reasoning');
      expect(session.messages[0].parts[1].type).toBe('text');
      expect(session.messages[0].parts[2].type).toBe('tool');
    });

    describe('session title extraction', () => {
      it('extracts title from first user message with text content', () => {
        const entries: ClaudeTranscriptEntry[] = [
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'Help me fix the login bug' }],
            },
          },
          {
            type: 'assistant',
            message: { role: 'assistant', content: [{ type: 'text', text: 'Sure!' }] },
          },
        ];

        const session = convertToSession(entries, 'test-session-id');

        expect(session.info.title).toBe('Help me fix the login bug');
      });

      it('skips user messages that only contain tool_result blocks (meta messages)', () => {
        const entries: ClaudeTranscriptEntry[] = [
          {
            type: 'assistant',
            message: {
              role: 'assistant',
              content: [{ type: 'tool_use', id: 'toolu_1', name: 'read_file', input: {} }],
            },
          },
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'file contents' }],
            },
          },
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'text', text: 'Now refactor the code' }],
            },
          },
        ];

        const session = convertToSession(entries, 'test-session-id');

        expect(session.info.title).toBe('Now refactor the code');
      });

      it('returns default title when no non-meta user messages exist', () => {
        const entries: ClaudeTranscriptEntry[] = [
          {
            type: 'assistant',
            message: {
              role: 'assistant',
              content: [{ type: 'tool_use', id: 'toolu_1', name: 'read_file', input: {} }],
            },
          },
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'file contents' }],
            },
          },
        ];

        const session = convertToSession(entries, 'test-session-id');

        expect(session.info.title).toBe('Claude Session');
      });

      it('truncates titles longer than 100 chars with ellipsis', () => {
        const longText = 'A'.repeat(150);
        const entries: ClaudeTranscriptEntry[] = [
          {
            type: 'user',
            message: {
              role: 'user',
              content: [{ type: 'text', text: longText }],
            },
          },
        ];

        const session = convertToSession(entries, 'test-session-id');

        expect(session.info.title).toBe('A'.repeat(100) + '...');
        expect(session.info.title.length).toBe(103); // 100 chars + "..."
      });

      it('extracts title from user message with string content', () => {
        const entries: ClaudeTranscriptEntry[] = [
          {
            type: 'user',
            message: {
              role: 'user',
              content: 'Simple string message' as unknown as [],
            },
          },
        ];

        const session = convertToSession(entries, 'test-session-id');

        expect(session.info.title).toBe('Simple string message');
      });

      it('extracts title from mixed content using first text block', () => {
        const entries: ClaudeTranscriptEntry[] = [
          {
            type: 'user',
            message: {
              role: 'user',
              content: [
                { type: 'tool_result', tool_use_id: 'toolu_1', content: 'result' },
                { type: 'text', text: 'Here is my actual question' },
              ],
            },
          },
        ];

        const session = convertToSession(entries, 'test-session-id');

        expect(session.info.title).toBe('Here is my actual question');
      });
    });
  });

  describe('metadata extraction', () => {
    it('extracts cwd from first entry into SessionInfo.directory', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
          cwd: '/Users/test/project',
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.directory).toBe('/Users/test/project');
    });

    it('extracts model from assistant message into AssistantMessageInfo.modelID', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
            model: 'claude-opus-4-5-20251101',
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const info = session.messages[0].info;
      expect(info.role).toBe('assistant');
      if (info.role === 'assistant') {
        expect(info.modelID).toBe('claude-opus-4-5-20251101');
      }
    });

    it('extracts cwd from entry into AssistantMessageInfo.path.cwd', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
          },
          cwd: '/Users/test/another-dir',
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const info = session.messages[0].info;
      expect(info.role).toBe('assistant');
      if (info.role === 'assistant') {
        expect(info.path.cwd).toBe('/Users/test/another-dir');
      }
    });

    it('uses first valid cwd when multiple entries have cwd', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
          cwd: '/first/path',
        },
        {
          type: 'assistant',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Hi' }] },
          cwd: '/second/path',
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.directory).toBe('/first/path');
    });

    it('uses default model when message.model is not present', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'assistant',
          message: {
            role: 'assistant',
            content: [{ type: 'text', text: 'Response' }],
          },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const info = session.messages[0].info;
      expect(info.role).toBe('assistant');
      if (info.role === 'assistant') {
        expect(info.modelID).toBe('claude');
      }
    });

    it('uses empty string for directory when no cwd present', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.directory).toBe('');
    });
  });

  describe('parseTimestamp', () => {
    const mockNow = 1704067200000; // 2024-01-01T00:00:00.000Z

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('parses valid ISO timestamp string to milliseconds', () => {
      const timestamp = '2024-06-15T10:30:00.123Z';
      const expected = new Date('2024-06-15T10:30:00.123Z').getTime();

      const result = parseTimestamp(timestamp);

      expect(result).toBe(expected);
    });

    it('returns Date.now() for undefined timestamp', () => {
      const result = parseTimestamp(undefined);

      expect(result).toBe(mockNow);
    });

    it('returns Date.now() for invalid timestamp format', () => {
      const result = parseTimestamp('not-a-valid-timestamp');

      expect(result).toBe(mockNow);
    });

    it('returns Date.now() for empty string timestamp', () => {
      const result = parseTimestamp('');

      expect(result).toBe(mockNow);
    });
  });

  describe('timestamp extraction in convertToSession', () => {
    const mockNow = 1704067200000; // 2024-01-01T00:00:00.000Z

    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(mockNow);
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('sets session time.created to earliest entry timestamp', () => {
      const entries = [
        {
          type: 'user' as const,
          timestamp: '2024-06-15T10:30:00.000Z',
          message: { role: 'user' as const, content: [{ type: 'text' as const, text: 'First' }] },
        },
        {
          type: 'assistant' as const,
          timestamp: '2024-06-15T10:31:00.000Z',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Second' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.time.created).toBe(new Date('2024-06-15T10:30:00.000Z').getTime());
    });

    it('sets session time.updated to latest entry timestamp', () => {
      const entries = [
        {
          type: 'user' as const,
          timestamp: '2024-06-15T10:30:00.000Z',
          message: { role: 'user' as const, content: [{ type: 'text' as const, text: 'First' }] },
        },
        {
          type: 'assistant' as const,
          timestamp: '2024-06-15T10:31:00.000Z',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Second' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.time.updated).toBe(new Date('2024-06-15T10:31:00.000Z').getTime());
    });

    it('sets user message time.created to entry timestamp', () => {
      const entries = [
        {
          type: 'user' as const,
          timestamp: '2024-06-15T10:30:00.000Z',
          message: { role: 'user' as const, content: [{ type: 'text' as const, text: 'Hello' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].info.time.created).toBe(new Date('2024-06-15T10:30:00.000Z').getTime());
    });

    it('sets assistant message time.created and time.completed to entry timestamp', () => {
      const entries = [
        {
          type: 'assistant' as const,
          timestamp: '2024-06-15T10:30:00.000Z',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Response' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const info = session.messages[0].info;
      expect(info.time.created).toBe(new Date('2024-06-15T10:30:00.000Z').getTime());
      if (info.role === 'assistant') {
        expect(info.time.completed).toBe(new Date('2024-06-15T10:30:00.000Z').getTime());
      }
    });

    it('falls back to Date.now() when entry has no timestamp', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.info.time.created).toBe(mockNow);
      expect(session.info.time.updated).toBe(mockNow);
      expect(session.messages[0].info.time.created).toBe(mockNow);
    });

    it('handles mixed valid and invalid timestamps using valid ones', () => {
      const entries = [
        {
          type: 'user' as const,
          timestamp: '2024-06-15T10:30:00.000Z',
          message: { role: 'user' as const, content: [{ type: 'text' as const, text: 'First' }] },
        },
        {
          type: 'assistant' as const,
          timestamp: 'invalid-timestamp',
          message: { role: 'assistant' as const, content: [{ type: 'text' as const, text: 'Second' }] },
        },
        {
          type: 'user' as const,
          timestamp: '2024-06-15T10:35:00.000Z',
          message: { role: 'user' as const, content: [{ type: 'text' as const, text: 'Third' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      // Earliest valid timestamp
      expect(session.info.time.created).toBe(new Date('2024-06-15T10:30:00.000Z').getTime());
      // Latest should be the third message's timestamp (valid)
      expect(session.info.time.updated).toBe(new Date('2024-06-15T10:35:00.000Z').getTime());
      // Invalid timestamp message falls back to Date.now()
      expect(session.messages[1].info.time.created).toBe(mockNow);
    });
  });

  describe('parentUuid threading', () => {
    it('sets empty parentID for root message with no parentUuid', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          uuid: 'uuid-1',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      expect(session.messages[0].info.role).toBe('user');
      // User messages don't have parentID, only assistant messages do
    });

    it('maps parentUuid to correct parentID for assistant message', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          uuid: 'uuid-user-1',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        },
        {
          type: 'assistant',
          uuid: 'uuid-assistant-1',
          parentUuid: 'uuid-user-1',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const assistantInfo = session.messages[1].info;
      expect(assistantInfo.role).toBe('assistant');
      if (assistantInfo.role === 'assistant') {
        expect(assistantInfo.parentID).toBe('test-session-id-msg-0');
      }
    });

    it('threads multi-turn conversation correctly via parentUuid', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          uuid: 'uuid-1',
          message: { role: 'user', content: [{ type: 'text', text: 'First question' }] },
        },
        {
          type: 'assistant',
          uuid: 'uuid-2',
          parentUuid: 'uuid-1',
          message: { role: 'assistant', content: [{ type: 'text', text: 'First answer' }] },
        },
        {
          type: 'user',
          uuid: 'uuid-3',
          parentUuid: 'uuid-2',
          message: { role: 'user', content: [{ type: 'text', text: 'Follow-up' }] },
        },
        {
          type: 'assistant',
          uuid: 'uuid-4',
          parentUuid: 'uuid-3',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Follow-up answer' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      // Assistant at index 1 should reference user at index 0
      const assistant1Info = session.messages[1].info;
      if (assistant1Info.role === 'assistant') {
        expect(assistant1Info.parentID).toBe('test-session-id-msg-0');
      }

      // Assistant at index 3 should reference user at index 2
      const assistant2Info = session.messages[3].info;
      if (assistant2Info.role === 'assistant') {
        expect(assistant2Info.parentID).toBe('test-session-id-msg-2');
      }
    });

    it('sets empty parentID when parentUuid is missing', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          uuid: 'uuid-user',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        },
        {
          type: 'assistant',
          uuid: 'uuid-assistant',
          // No parentUuid field
          message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const assistantInfo = session.messages[1].info;
      if (assistantInfo.role === 'assistant') {
        expect(assistantInfo.parentID).toBe('');
      }
    });

    it('sets empty parentID when parentUuid references non-existent uuid', () => {
      const entries: ClaudeTranscriptEntry[] = [
        {
          type: 'user',
          uuid: 'uuid-user',
          message: { role: 'user', content: [{ type: 'text', text: 'Hello' }] },
        },
        {
          type: 'assistant',
          uuid: 'uuid-assistant',
          parentUuid: 'non-existent-uuid',
          message: { role: 'assistant', content: [{ type: 'text', text: 'Hi!' }] },
        },
      ];

      const session = convertToSession(entries, 'test-session-id');

      const assistantInfo = session.messages[1].info;
      if (assistantInfo.role === 'assistant') {
        expect(assistantInfo.parentID).toBe('');
      }
    });
  });
});
