import type {
  ClaudeTranscriptEntry,
  ClaudeContentBlock,
  ClaudeAssistantMessage,
  ClaudeToolResult,
} from '../types/claude';
import { isClaudeMessageEntry } from '../types/claude';
import type {
  Session,
  SessionInfo,
  Message,
  UserMessageInfo,
  AssistantMessageInfo,
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  ToolPartCompleted,
  ToolPartError,
} from '../types/session';

/**
 * Parses an ISO timestamp string to milliseconds.
 * Returns Date.now() for invalid or missing timestamps.
 */
export function parseTimestamp(timestamp: string | undefined): number {
  if (!timestamp) {
    return Date.now();
  }
  const parsed = new Date(timestamp).getTime();
  if (Number.isNaN(parsed)) {
    return Date.now();
  }
  return parsed;
}

/**
 * Parses a JSONL string containing Claude transcript entries.
 */
export function parseClaudeJsonl(jsonl: string): ClaudeTranscriptEntry[] {
  const lines = jsonl.split('\n');
  const entries: ClaudeTranscriptEntry[] = [];

  for (const line of lines) {
    if (line.trim() === '') continue;
    const parsed = JSON.parse(line);
    if (isClaudeMessageEntry(parsed)) {
      // Skip user messages with isMeta=true (system/command messages)
      if (parsed.type === 'user' && parsed.isMeta) continue;
      entries.push(parsed);
    }
  }

  return entries;
}

/**
 * Converts a Claude content block to a normalized Part.
 * tool_result blocks return null and are handled separately via linking.
 */
function convertContentBlockToPart(
  block: ClaudeContentBlock,
  sessionId: string,
  messageId: string
): Part | null {
  const basePart = { id: crypto.randomUUID(), sessionID: sessionId, messageID: messageId };

  if (block.type === 'text') {
    return { ...basePart, type: 'text', text: block.text } as TextPart;
  }

  if (block.type === 'tool_use') {
    return {
      ...basePart,
      type: 'tool',
      tool: block.name,
      callID: block.id,
      state: {
        status: 'completed',
        input: block.input,
        output: '',
        title: block.name,
        time: { start: Date.now(), end: Date.now() },
      },
    } as ToolPart;
  }

  // tool_result - skip here, handled via linking
  if (block.type === 'tool_result') {
    return null;
  }

  if (block.type === 'thinking') {
    return { ...basePart, type: 'reasoning', text: block.thinking } as ReasoningPart;
  }

  return { ...basePart, type: 'text', text: '' } as TextPart;
}

/**
 * Extracts tool_result content as a string.
 */
function extractToolResultContent(result: ClaudeToolResult): string {
  if (typeof result.content === 'string') {
    return result.content;
  }
  return result.content.map((b) => b.text).join('\n');
}

/**
 * Extracts text content from a user message, if any exists.
 * Returns null for meta messages (only tool_result blocks).
 */
function extractUserMessageText(entry: ClaudeTranscriptEntry): string | null {
  if (entry.type !== 'user') return null;

  const content = entry.message.content;

  // String content is always real user text
  if (typeof content === 'string') {
    return content;
  }

  // Find first text block in array content
  for (const block of content) {
    if (block.type === 'text') {
      return block.text;
    }
  }

  // No text blocks found - this is a meta message (only tool_result)
  return null;
}

/**
 * Extracts session title from first non-meta user message.
 * Truncates to 100 chars with ellipsis if needed.
 */
function extractSessionTitle(entries: ClaudeTranscriptEntry[]): string {
  for (const entry of entries) {
    const text = extractUserMessageText(entry);
    if (text !== null) {
      if (text.length > 100) {
        return text.slice(0, 100) + '...';
      }
      return text;
    }
  }
  return 'Claude Session';
}

/**
 * Extracts the first valid cwd from entries.
 */
function extractDirectory(entries: ClaudeTranscriptEntry[]): string {
  for (const entry of entries) {
    if (entry.cwd) {
      return entry.cwd;
    }
  }
  return '';
}

/**
 * Converts Claude transcript entries to a normalized Session.
 * Links tool_result blocks to their corresponding tool_use blocks.
 */
export function convertToSession(
  entries: ClaudeTranscriptEntry[],
  sessionId: string
): Session {
  const now = Date.now();

  // Parse all timestamps, tracking valid ones for session-level min/max
  const messageTimestamps = entries.map((entry) => parseTimestamp(entry.timestamp));
  const validTimestamps = entries
    .filter((entry) => entry.timestamp && !Number.isNaN(new Date(entry.timestamp).getTime()))
    .map((entry) => new Date(entry.timestamp!).getTime());

  const sessionCreated = validTimestamps.length > 0 ? Math.min(...validTimestamps) : now;
  const sessionUpdated = validTimestamps.length > 0 ? Math.max(...validTimestamps) : now;

  const info: SessionInfo = {
    id: sessionId,
    version: 'claude-code-1.0',
    projectID: 'claude',
    directory: extractDirectory(entries),
    title: extractSessionTitle(entries),
    time: { created: sessionCreated, updated: sessionUpdated },
  };

  // Map to track tool_use_id → ToolPart for linking
  const toolPartsMap = new Map<string, ToolPart>();

  // Build uuid → messageId map for parentUuid threading
  const uuidToMessageId = new Map<string, string>();
  entries.forEach((entry, index) => {
    if (entry.uuid) {
      uuidToMessageId.set(entry.uuid, `${sessionId}-msg-${index}`);
    }
  });

  // First pass: create messages and collect tool parts
  const messages: Message[] = entries.map((entry, index) => {
    const messageId = `${sessionId}-msg-${index}`;
    const parts: Part[] = [];
    const messageTime = messageTimestamps[index];

    // Handle string content (simple user messages)
    const content = entry.message.content;
    if (typeof content === 'string') {
      const textPart: TextPart = {
        id: crypto.randomUUID(),
        sessionID: sessionId,
        messageID: messageId,
        type: 'text',
        text: content,
      };
      parts.push(textPart);
    } else {
      for (const block of content) {
        const part = convertContentBlockToPart(block, sessionId, messageId);
        if (part) {
          parts.push(part);
          // Track tool_use parts for linking
          if (part.type === 'tool' && 'callID' in part) {
            toolPartsMap.set(part.callID, part as ToolPart);
          }
        }
      }
    }

    if (entry.type === 'user') {
      const userInfo: UserMessageInfo = {
        id: messageId,
        sessionID: sessionId,
        role: 'user',
        time: { created: messageTime },
        agent: 'user',
        model: { providerID: 'anthropic', modelID: 'claude' },
      };
      return { info: userInfo, parts };
    }

    // assistant
    const assistantEntry = entry as ClaudeAssistantMessage;
    const usage = assistantEntry.usage;
    const modelID = assistantEntry.message.model ?? 'claude';
    const entryCwd = assistantEntry.cwd ?? '';

    // Use parentUuid for threading, default to empty if not found
    const parentID = entry.parentUuid ? (uuidToMessageId.get(entry.parentUuid) ?? '') : '';

    const assistantInfo: AssistantMessageInfo = {
      id: messageId,
      sessionID: sessionId,
      role: 'assistant',
      parentID,
      time: { created: messageTime, completed: messageTime },
      modelID,
      providerID: 'anthropic',
      agent: 'claude',
      mode: 'agent',
      path: { cwd: entryCwd, root: '' },
      cost: 0,
      tokens: {
        input: usage?.input_tokens ?? 0,
        output: usage?.output_tokens ?? 0,
        reasoning: 0,
        cache: {
          read: usage?.cache_read_input_tokens ?? 0,
          write: usage?.cache_creation_input_tokens ?? 0,
        },
      },
    };
    return { info: assistantInfo, parts };
  });

  // Second pass: link tool_results to tool_use parts
  for (const entry of entries) {
    const content = entry.message.content;
    // Skip string content - no tool_results in simple messages
    if (typeof content === 'string') continue;

    for (const block of content) {
      if (block.type === 'tool_result') {
        const toolPart = toolPartsMap.get(block.tool_use_id);
        if (toolPart) {
          const resultContent = extractToolResultContent(block);
          if (block.is_error) {
            toolPart.state = {
              status: 'error',
              input: (toolPart.state as ToolPartCompleted).input,
              error: resultContent,
              time: { start: Date.now(), end: Date.now() },
            } as ToolPartError;
          } else {
            (toolPart.state as ToolPartCompleted).output = resultContent;
          }
        }
      }
    }
  }

  return { info, messages };
}
