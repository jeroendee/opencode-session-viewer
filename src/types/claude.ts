// Claude JSONL Transcript Types
// Based on Claude Messages API response format

/**
 * Text content block in Claude messages
 */
export interface ClaudeTextBlock {
  type: 'text';
  text: string;
}

/**
 * Tool use content block - when Claude invokes a tool
 */
export interface ClaudeToolUse {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

/**
 * Tool result content block - result returned to Claude after tool execution
 */
export interface ClaudeToolResult {
  type: 'tool_result';
  tool_use_id: string;
  content: string | ClaudeTextBlock[];
  is_error?: boolean;
}

/**
 * Union of all content block types in Claude messages
 */
export type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUse | ClaudeToolResult;

/**
 * Token usage tracking for Claude API responses
 */
export interface ClaudeUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * User message entry in Claude transcript
 */
export interface ClaudeUserMessage {
  type: 'user';
  message: {
    role: 'user';
    content: string | ClaudeContentBlock[];
  };
}

/**
 * Assistant message entry in Claude transcript
 */
export interface ClaudeAssistantMessage {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: ClaudeContentBlock[];
  };
  usage?: ClaudeUsage;
}

/**
 * Union of transcript entry types
 */
export type ClaudeTranscriptEntry = ClaudeUserMessage | ClaudeAssistantMessage;

// Type guards

/**
 * Type guard to check if entry is a user message
 */
export function isClaudeUserEntry(
  entry: ClaudeTranscriptEntry
): entry is ClaudeUserMessage {
  return entry.type === 'user';
}

/**
 * Type guard to check if entry is an assistant message
 */
export function isClaudeAssistantEntry(
  entry: ClaudeTranscriptEntry
): entry is ClaudeAssistantMessage {
  return entry.type === 'assistant';
}
