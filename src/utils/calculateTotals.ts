import type { Session, Message } from '../types/session';
import { isAssistantMessage } from '../types/session';

export interface SessionTotals {
  cost: number;
  tokens: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    total: number;
  };
  duration: {
    start: number;
    end: number;
    durationMs: number;
  };
  messageCount: {
    user: number;
    assistant: number;
    total: number;
  };
}

interface MessageStats {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens: number;
  cacheRead: number;
  cacheWrite: number;
  userCount: number;
  assistantCount: number;
}

/**
 * Sum stats from a collection of messages.
 */
function sumMessageStats(messages: Message[]): MessageStats {
  let cost = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let reasoningTokens = 0;
  let cacheRead = 0;
  let cacheWrite = 0;
  let userCount = 0;
  let assistantCount = 0;

  for (const message of messages) {
    if (isAssistantMessage(message)) {
      const info = message.info;
      cost += info.cost || 0;
      inputTokens += info.tokens?.input || 0;
      outputTokens += info.tokens?.output || 0;
      reasoningTokens += info.tokens?.reasoning || 0;
      cacheRead += info.tokens?.cache?.read || 0;
      cacheWrite += info.tokens?.cache?.write || 0;
      assistantCount++;
    } else {
      userCount++;
    }
  }

  return {
    cost,
    inputTokens,
    outputTokens,
    reasoningTokens,
    cacheRead,
    cacheWrite,
    userCount,
    assistantCount,
  };
}

/**
 * Convert message stats to the tokens and messageCount shape used in SessionTotals.
 */
function statsToTotals(stats: MessageStats): Omit<SessionTotals, 'duration'> {
  return {
    cost: stats.cost,
    tokens: {
      input: stats.inputTokens,
      output: stats.outputTokens,
      reasoning: stats.reasoningTokens,
      cacheRead: stats.cacheRead,
      cacheWrite: stats.cacheWrite,
      total: stats.inputTokens + stats.outputTokens + stats.reasoningTokens,
    },
    messageCount: {
      user: stats.userCount,
      assistant: stats.assistantCount,
      total: stats.userCount + stats.assistantCount,
    },
  };
}

/**
 * Calculate totals for cost, tokens, and duration from a session.
 */
export function calculateTotals(session: Session): SessionTotals {
  const stats = sumMessageStats(session.messages);
  const baseTotals = statsToTotals(stats);

  // Calculate duration from time bounds
  let earliestTime = session.info.time.created;
  let latestTime = session.info.time.updated;

  for (const message of session.messages) {
    if (message.info.time.created < earliestTime) {
      earliestTime = message.info.time.created;
    }
    if (isAssistantMessage(message)) {
      const info = message.info;
      if (info.time.completed && info.time.completed > latestTime) {
        latestTime = info.time.completed;
      }
    }
  }

  return {
    ...baseTotals,
    duration: {
      start: earliestTime,
      end: latestTime,
      durationMs: latestTime - earliestTime,
    },
  };
}

/**
 * Calculate totals for a subset of messages.
 */
export function calculateMessageTotals(messages: Message[]): Omit<SessionTotals, 'duration'> {
  return statsToTotals(sumMessageStats(messages));
}
