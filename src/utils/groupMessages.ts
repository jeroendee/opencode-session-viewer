import type { Message, UserMessage, AssistantMessage } from '../types/session';
import { isUserMessage, isAssistantMessage } from '../types/session';

/**
 * A group of messages consisting of one user message and all its assistant responses.
 * Multiple assistant messages can belong to one user message (multi-step responses).
 */
export interface MessageGroup {
  userMessage: UserMessage;
  assistantMessages: AssistantMessage[];
}

/**
 * Groups consecutive assistant messages that share the same parentID (user message).
 * Each group contains one user message and all assistant messages that respond to it.
 */
export function groupMessages(messages: Message[]): MessageGroup[] {
  const groups: MessageGroup[] = [];
  const userMessages = new Map<string, UserMessage>();
  const assistantsByParent = new Map<string, AssistantMessage[]>();

  // First pass: collect all user messages and group assistant messages by parentID
  for (const message of messages) {
    if (isUserMessage(message)) {
      userMessages.set(message.info.id, message);
    } else if (isAssistantMessage(message)) {
      const parentID = message.info.parentID;
      const existing = assistantsByParent.get(parentID) || [];
      existing.push(message);
      assistantsByParent.set(parentID, existing);
    }
  }

  // Second pass: create groups in message order
  for (const message of messages) {
    if (isUserMessage(message)) {
      const assistants = assistantsByParent.get(message.info.id) || [];
      // Sort assistant messages by creation time
      assistants.sort((a, b) => a.info.time.created - b.info.time.created);
      
      groups.push({
        userMessage: message,
        assistantMessages: assistants,
      });
    }
  }

  return groups;
}

/**
 * Get a summary of a message group for display in navigation.
 */
export function getGroupSummary(group: MessageGroup): string {
  // Use the user message summary title if available
  if (group.userMessage.info.summary?.title) {
    return group.userMessage.info.summary.title;
  }

  // Otherwise, extract the first ~50 characters of user text
  for (const part of group.userMessage.parts) {
    if (part.type === 'text') {
      const text = part.text.trim();
      if (text.length > 50) {
        return text.substring(0, 47) + '...';
      }
      return text;
    }
  }

  return 'Message';
}

/**
 * Count tool calls and steps in assistant messages.
 */
export function getAssistantStats(assistantMessages: AssistantMessage[]): {
  stepCount: number;
  toolCount: number;
  hasReasoning: boolean;
} {
  let stepCount = 0;
  let toolCount = 0;
  let hasReasoning = false;

  for (const message of assistantMessages) {
    for (const part of message.parts) {
      if (part.type === 'step-start') {
        stepCount++;
      } else if (part.type === 'tool') {
        toolCount++;
      } else if (part.type === 'reasoning') {
        hasReasoning = true;
      }
    }
  }

  return { stepCount, toolCount, hasReasoning };
}
