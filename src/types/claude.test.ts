import { describe, it, expect } from 'vitest';
import {
  type ClaudeTranscriptEntry,
  type ClaudeUserMessage,
  type ClaudeAssistantMessage,
  type ClaudeToolUse,
  type ClaudeToolResult,
  type ClaudeUsage,
  type ClaudeTextBlock,
  isClaudeUserEntry,
  isClaudeAssistantEntry,
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

      expect(userMessage.message.content[0].type).toBe('tool_result');
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
});
