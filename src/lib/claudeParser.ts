import type {
  ClaudeTranscriptEntry,
  ClaudeContentBlock,
  ClaudeAssistantMessage,
  ClaudeToolResult,
} from '../types/claude';
import type {
  Session,
  SessionInfo,
  Message,
  UserMessageInfo,
  AssistantMessageInfo,
  Part,
  TextPart,
  ToolPart,
  ToolPartCompleted,
  ToolPartError,
} from '../types/session';

/**
 * Parses a JSONL string containing Claude transcript entries.
 */
export function parseClaudeJsonl(jsonl: string): ClaudeTranscriptEntry[] {
  const lines = jsonl.split('\n');
  const entries: ClaudeTranscriptEntry[] = [];

  for (const line of lines) {
    if (line.trim() === '') continue;
    entries.push(JSON.parse(line) as ClaudeTranscriptEntry);
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
 * Converts Claude transcript entries to a normalized Session.
 * Links tool_result blocks to their corresponding tool_use blocks.
 */
export function convertToSession(
  entries: ClaudeTranscriptEntry[],
  sessionId: string
): Session {
  const now = Date.now();

  const info: SessionInfo = {
    id: sessionId,
    version: 'claude-code-1.0',
    projectID: 'claude',
    directory: '',
    title: 'Claude Session',
    time: { created: now, updated: now },
  };

  // Map to track tool_use_id → ToolPart for linking
  const toolPartsMap = new Map<string, ToolPart>();

  // First pass: create messages and collect tool parts
  const messages: Message[] = entries.map((entry, index) => {
    const messageId = `${sessionId}-msg-${index}`;
    const parts: Part[] = [];

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
        time: { created: now },
        agent: 'user',
        model: { providerID: 'anthropic', modelID: 'claude' },
      };
      return { info: userInfo, parts };
    }

    // assistant
    const assistantEntry = entry as ClaudeAssistantMessage;
    const usage = assistantEntry.usage;

    const assistantInfo: AssistantMessageInfo = {
      id: messageId,
      sessionID: sessionId,
      role: 'assistant',
      parentID: index > 0 ? `${sessionId}-msg-${index - 1}` : '',
      time: { created: now, completed: now },
      modelID: 'claude',
      providerID: 'anthropic',
      agent: 'claude',
      mode: 'agent',
      path: { cwd: '', root: '' },
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
