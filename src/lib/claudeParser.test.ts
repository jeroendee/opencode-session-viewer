import { describe, it, expect } from 'vitest';
import { parseClaudeJsonl, convertToSession } from './claudeParser';
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
  });
});
