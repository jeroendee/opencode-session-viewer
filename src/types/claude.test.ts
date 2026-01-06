import { describe, it, expect } from 'vitest';
import {
  type ClaudeTranscriptEntry,
  type ClaudeUserMessage,
  type ClaudeAssistantMessage,
  type ClaudeToolUse,
  type ClaudeToolResult,
  type ClaudeUsage,
  type ClaudeTextBlock,
  type ClaudeThinkingBlock,
  type ClaudeBaseEntry,
  type ClaudeFileHistorySnapshot,
  type ClaudeSystemEntry,
  isClaudeUserEntry,
  isClaudeAssistantEntry,
  isClaudeMessageEntry,
} from './claude';

describe('Claude TypeScript Types', () => {
  describe('ClaudeUserMessage', () => {
    it('accepts valid user message structure', () => {
      const userMessage: ClaudeUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      };

      expect(userMessage.type).toBe('user');
      expect(userMessage.message.role).toBe('user');
      expect(userMessage.message.content).toHaveLength(1);
    });

    it('accepts user message with string content', () => {
      const userMessage: ClaudeUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello, this is a simple string message',
        },
      };

      expect(userMessage.type).toBe('user');
      expect(userMessage.message.role).toBe('user');
      expect(userMessage.message.content).toBe('Hello, this is a simple string message');
    });

    it('accepts optional sessionId field for agent parent linking', () => {
      const userMessage: ClaudeUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello',
        },
        sessionId: 'parent-session-uuid-123',
      };

      expect(userMessage.sessionId).toBe('parent-session-uuid-123');
    });

    it('allows sessionId to be undefined', () => {
      const userMessage: ClaudeUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: 'Hello',
        },
      };

      expect(userMessage.sessionId).toBeUndefined();
    });

    it('accepts user message with tool_result content', () => {
      const toolResult: ClaudeToolResult = {
        type: 'tool_result',
        tool_use_id: 'toolu_01A09q90qw90lq917835lq9',
        content: 'Result text',
      };

      const userMessage: ClaudeUserMessage = {
        type: 'user',
        message: {
          role: 'user',
          content: [toolResult],
        },
      };

      const content = userMessage.message.content;
      expect(Array.isArray(content)).toBe(true);
      if (Array.isArray(content)) {
        expect(content[0].type).toBe('tool_result');
      }
    });
  });

  describe('ClaudeAssistantMessage', () => {
    it('accepts valid assistant message structure', () => {
      const assistantMessage: ClaudeAssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello back!' }],
        },
      };

      expect(assistantMessage.type).toBe('assistant');
      expect(assistantMessage.message.role).toBe('assistant');
      expect(assistantMessage.message.content).toHaveLength(1);
    });

    it('accepts assistant message with tool_use content', () => {
      const toolUse: ClaudeToolUse = {
        type: 'tool_use',
        id: 'toolu_01A09q90qw90lq917835lq9',
        name: 'get_weather',
        input: { location: 'San Francisco, CA' },
      };

      const assistantMessage: ClaudeAssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [toolUse],
        },
      };

      expect(assistantMessage.message.content[0].type).toBe('tool_use');
    });

    it('accepts optional sessionId field for agent parent linking', () => {
      const assistantMessage: ClaudeAssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
        },
        sessionId: 'parent-session-uuid-456',
      };

      expect(assistantMessage.sessionId).toBe('parent-session-uuid-456');
    });

    it('allows sessionId to be undefined', () => {
      const assistantMessage: ClaudeAssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
        },
      };

      expect(assistantMessage.sessionId).toBeUndefined();
    });

    it('accepts assistant message with usage data', () => {
      const usage: ClaudeUsage = {
        input_tokens: 100,
        output_tokens: 50,
      };

      const assistantMessage: ClaudeAssistantMessage = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Response' }],
        },
        usage,
      };

      expect(assistantMessage.usage?.input_tokens).toBe(100);
      expect(assistantMessage.usage?.output_tokens).toBe(50);
    });

    it('accepts usage with cache tokens', () => {
      const usage: ClaudeUsage = {
        input_tokens: 100,
        output_tokens: 50,
        cache_creation_input_tokens: 10,
        cache_read_input_tokens: 20,
      };

      expect(usage.cache_creation_input_tokens).toBe(10);
      expect(usage.cache_read_input_tokens).toBe(20);
    });
  });

  describe('ClaudeToolUse', () => {
    it('has required fields', () => {
      const toolUse: ClaudeToolUse = {
        type: 'tool_use',
        id: 'toolu_01A09q90qw90lq917835lq9',
        name: 'get_weather',
        input: { location: 'San Francisco, CA', unit: 'celsius' },
      };

      expect(toolUse.type).toBe('tool_use');
      expect(toolUse.id).toBe('toolu_01A09q90qw90lq917835lq9');
      expect(toolUse.name).toBe('get_weather');
      expect(toolUse.input).toEqual({ location: 'San Francisco, CA', unit: 'celsius' });
    });
  });

  describe('ClaudeToolResult', () => {
    it('has required fields with string content', () => {
      const toolResult: ClaudeToolResult = {
        type: 'tool_result',
        tool_use_id: 'toolu_01A09q90qw90lq917835lq9',
        content: '15 degrees',
      };

      expect(toolResult.type).toBe('tool_result');
      expect(toolResult.tool_use_id).toBe('toolu_01A09q90qw90lq917835lq9');
      expect(toolResult.content).toBe('15 degrees');
    });

    it('accepts content as array of content blocks', () => {
      const toolResult: ClaudeToolResult = {
        type: 'tool_result',
        tool_use_id: 'toolu_01A09q90qw90lq917835lq9',
        content: [{ type: 'text', text: '15 degrees' }],
      };

      expect(Array.isArray(toolResult.content)).toBe(true);
    });

    it('accepts is_error flag', () => {
      const toolResult: ClaudeToolResult = {
        type: 'tool_result',
        tool_use_id: 'toolu_01A09q90qw90lq917835lq9',
        content: 'ConnectionError: service unavailable',
        is_error: true,
      };

      expect(toolResult.is_error).toBe(true);
    });
  });

  describe('ClaudeTextBlock', () => {
    it('has type text and text field', () => {
      const textBlock: ClaudeTextBlock = {
        type: 'text',
        text: 'Hello, world!',
      };

      expect(textBlock.type).toBe('text');
      expect(textBlock.text).toBe('Hello, world!');
    });
  });

  describe('ClaudeUsage', () => {
    it('tracks basic token counts', () => {
      const usage: ClaudeUsage = {
        input_tokens: 500,
        output_tokens: 200,
      };

      expect(usage.input_tokens).toBe(500);
      expect(usage.output_tokens).toBe(200);
    });
  });

  describe('isClaudeUserEntry', () => {
    it('returns true for user entry', () => {
      const userEntry: ClaudeTranscriptEntry = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      };

      expect(isClaudeUserEntry(userEntry)).toBe(true);
    });

    it('returns false for assistant entry', () => {
      const assistantEntry: ClaudeTranscriptEntry = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello back!' }],
        },
      };

      expect(isClaudeUserEntry(assistantEntry)).toBe(false);
    });
  });

  describe('isClaudeAssistantEntry', () => {
    it('returns true for assistant entry', () => {
      const assistantEntry: ClaudeTranscriptEntry = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello back!' }],
        },
      };

      expect(isClaudeAssistantEntry(assistantEntry)).toBe(true);
    });

    it('returns false for user entry', () => {
      const userEntry: ClaudeTranscriptEntry = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      };

      expect(isClaudeAssistantEntry(userEntry)).toBe(false);
    });
  });

  describe('ClaudeThinkingBlock', () => {
    it('has type thinking with thinking and signature fields', () => {
      const thinkingBlock: ClaudeThinkingBlock = {
        type: 'thinking',
        thinking: 'Let me analyze this step by step...',
        signature: 'abc123signature',
      };

      expect(thinkingBlock.type).toBe('thinking');
      expect(thinkingBlock.thinking).toBe('Let me analyze this step by step...');
      expect(thinkingBlock.signature).toBe('abc123signature');
    });
  });

  describe('ClaudeBaseEntry', () => {
    it('has uuid, type, and optional timestamp fields', () => {
      const baseEntry: ClaudeBaseEntry = {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        type: 'user',
      };

      expect(baseEntry.uuid).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(baseEntry.type).toBe('user');
      expect(baseEntry.timestamp).toBeUndefined();
    });

    it('accepts timestamp field', () => {
      const baseEntry: ClaudeBaseEntry = {
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        type: 'assistant',
        timestamp: '2025-01-06T12:00:00Z',
      };

      expect(baseEntry.timestamp).toBe('2025-01-06T12:00:00Z');
    });
  });

  describe('ClaudeFileHistorySnapshot', () => {
    it('has type file_history_snapshot with snapshot data', () => {
      const snapshot: ClaudeFileHistorySnapshot = {
        type: 'file_history_snapshot',
        snapshot: {
          '/path/to/file.ts': 'file content hash or data',
        },
      };

      expect(snapshot.type).toBe('file_history_snapshot');
      expect(snapshot.snapshot['/path/to/file.ts']).toBe('file content hash or data');
    });
  });

  describe('ClaudeSystemEntry', () => {
    it('has type system with message content', () => {
      const systemEntry: ClaudeSystemEntry = {
        type: 'system',
        message: {
          content: 'System initialized',
        },
      };

      expect(systemEntry.type).toBe('system');
      expect(systemEntry.message.content).toBe('System initialized');
    });
  });

  describe('isClaudeMessageEntry', () => {
    it('returns true for user entry', () => {
      const userEntry: ClaudeTranscriptEntry = {
        type: 'user',
        message: {
          role: 'user',
          content: [{ type: 'text', text: 'Hello' }],
        },
      };

      expect(isClaudeMessageEntry(userEntry)).toBe(true);
    });

    it('returns true for assistant entry', () => {
      const assistantEntry: ClaudeTranscriptEntry = {
        type: 'assistant',
        message: {
          role: 'assistant',
          content: [{ type: 'text', text: 'Hello back!' }],
        },
      };

      expect(isClaudeMessageEntry(assistantEntry)).toBe(true);
    });

    it('returns false for system entry', () => {
      const systemEntry = {
        type: 'system',
        message: {
          content: 'System initialized',
        },
      } as unknown;

      expect(isClaudeMessageEntry(systemEntry)).toBe(false);
    });

    it('returns false for file_history_snapshot entry', () => {
      const snapshotEntry = {
        type: 'file_history_snapshot',
        snapshot: {},
      } as unknown;

      expect(isClaudeMessageEntry(snapshotEntry)).toBe(false);
    });
  });
});
