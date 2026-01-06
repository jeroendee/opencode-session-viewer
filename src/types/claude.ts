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
 * Thinking content block - Claude's extended thinking output
 */
export interface ClaudeThinkingBlock {
  type: 'thinking';
  thinking: string;
  signature: string;
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
export type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUse | ClaudeToolResult | ClaudeThinkingBlock;

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
 * Base fields for transcript entries
 */
export interface ClaudeBaseEntry {
  uuid: string;
  type: string;
  timestamp?: string;
}

/**
 * User message entry in Claude transcript
 */
export interface ClaudeUserMessage {
  type: 'user';
  uuid?: string;
  parentUuid?: string;
  timestamp?: string;
  message: {
    role: 'user';
    content: string | ClaudeContentBlock[];
  };
  cwd?: string;
  gitBranch?: string;
}

/**
 * Assistant message entry in Claude transcript
 */
export interface ClaudeAssistantMessage {
  type: 'assistant';
  uuid?: string;
  parentUuid?: string;
  timestamp?: string;
  message: {
    role: 'assistant';
    content: ClaudeContentBlock[];
    model?: string;
  };
  usage?: ClaudeUsage;
  cwd?: string;
  gitBranch?: string;
}

/**
 * File history snapshot entry - tracks file state
 */
export interface ClaudeFileHistorySnapshot {
  type: 'file_history_snapshot';
  snapshot: Record<string, string>;
}

/**
 * System entry - system messages in transcript
 */
export interface ClaudeSystemEntry {
  type: 'system';
  message: {
    content: string;
  };
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

/**
 * Type guard to check if entry is a user or assistant message (not system/snapshot)
 */
export function isClaudeMessageEntry(
  entry: unknown
): entry is ClaudeUserMessage | ClaudeAssistantMessage {
  if (typeof entry !== 'object' || entry === null) {
    return false;
  }
  const typed = entry as { type?: unknown };
  return typed.type === 'user' || typed.type === 'assistant';
}
