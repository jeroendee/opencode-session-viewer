import { useState, useEffect, useMemo, useCallback } from 'react';
import type { SessionInfo } from '../types/session';

/**
 * Options for controlling search behavior.
 */
export interface SearchOptions {
  /** When true, also search through user message content */
  includeMessages?: boolean;
}

/**
 * A search result representing a match in a session.
 */
export interface SearchResult {
  sessionId: string;
  session: SessionInfo;
  matchType: 'title' | 'summary' | 'date' | 'message';
  matchText: string; // The text that matched
  preview: string; // Snippet with context
}

/**
 * Parse a natural language date query and return start/end timestamps.
 * Returns null if the query is not a date.
 */
export function parseDateQuery(query: string): { start: number; end: number } | null {
  const normalizedQuery = query.toLowerCase().trim();
  const now = new Date();

  // Helper to get start of day
  const startOfDay = (date: Date): number => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };

  // Helper to get end of day
  const endOfDay = (date: Date): number => {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d.getTime();
  };

  // Today
  if (normalizedQuery === 'today') {
    return { start: startOfDay(now), end: endOfDay(now) };
  }

  // Yesterday
  if (normalizedQuery === 'yesterday') {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { start: startOfDay(yesterday), end: endOfDay(yesterday) };
  }

  // Last week (past 7 days)
  if (normalizedQuery === 'last week') {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    return { start: startOfDay(weekAgo), end: endOfDay(now) };
  }

  // This month
  if (normalizedQuery === 'this month') {
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start: startOfDay(monthStart), end: endOfDay(now) };
  }

  // ISO format: 2025-01-03
  const isoMatch = normalizedQuery.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, yearStr, monthStr, dayStr] = isoMatch;
    const year = parseInt(yearStr);
    const month = parseInt(monthStr);
    const day = parseInt(dayStr);

    // Validate month and day ranges
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const date = new Date(year, month - 1, day);
      // Also verify the date didn't roll over (e.g., Feb 30 -> Mar 2)
      if (!isNaN(date.getTime()) && date.getMonth() === month - 1 && date.getDate() === day) {
        return { start: startOfDay(date), end: endOfDay(date) };
      }
    }
  }

  // Month name and day: "jan 3", "january 3", "jan 03"
  const monthNames: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  const monthDayMatch = normalizedQuery.match(/^([a-z]+)\s+(\d{1,2})$/);
  if (monthDayMatch) {
    const [, monthStr, dayStr] = monthDayMatch;
    const month = monthNames[monthStr];
    if (month !== undefined) {
      const day = parseInt(dayStr);
      // Use current year, or previous year if the date is in the future
      let year = now.getFullYear();
      const date = new Date(year, month, day);
      if (date.getTime() > now.getTime()) {
        year--;
      }
      const finalDate = new Date(year, month, day);
      // Verify the date didn't roll over (e.g., Feb 30 -> Mar 2)
      if (!isNaN(finalDate.getTime()) && finalDate.getMonth() === month && finalDate.getDate() === day) {
        return { start: startOfDay(finalDate), end: endOfDay(finalDate) };
      }
    }
  }

  return null;
}

/**
 * Get context around a match (surrounding text).
 */
function getContext(text: string, matchIndex: number, query: string, contextLength = 30): string {
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + query.length + contextLength);

  let context = text.substring(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';

  return context.replace(/\n+/g, ' ').trim();
}

/**
 * Format a date for display in search results.
 */
function formatDatePreview(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Search through sessions and return matching results.
 */
export function searchSessions(
  query: string,
  sessions: Map<string, SessionInfo> | Record<string, SessionInfo>,
  options: SearchOptions = {}
): SearchResult[] {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) {
    return [];
  }

  const results: SearchResult[] = [];
  const lowerQuery = trimmedQuery.toLowerCase();
  const { includeMessages = false } = options;

  // Convert Record to iterable entries if needed
  const sessionEntries = sessions instanceof Map
    ? Array.from(sessions.entries())
    : Object.entries(sessions);

  // Check if query is a date
  const dateRange = parseDateQuery(trimmedQuery);

  for (const [sessionId, session] of sessionEntries) {
    // Date search
    if (dateRange) {
      const sessionTime = session.time.created;
      if (sessionTime >= dateRange.start && sessionTime <= dateRange.end) {
        results.push({
          sessionId,
          session,
          matchType: 'date',
          matchText: trimmedQuery,
          preview: formatDatePreview(sessionTime),
        });
      }
      continue; // If it's a date query, only match by date
    }

    // Title search (case-insensitive)
    const lowerTitle = session.title.toLowerCase();
    const titleIndex = lowerTitle.indexOf(lowerQuery);
    if (titleIndex !== -1) {
      results.push({
        sessionId,
        session,
        matchType: 'title',
        matchText: session.title.substring(titleIndex, titleIndex + trimmedQuery.length),
        preview: getContext(session.title, titleIndex, trimmedQuery),
      });
      continue; // Found in title, skip other checks for this session
    }

    // Summary search - check diffs array if available
    let foundInSummary = false;
    if (session.summary?.diffs) {
      for (const diff of session.summary.diffs) {
        const lowerDiff = diff.toLowerCase();
        const diffIndex = lowerDiff.indexOf(lowerQuery);
        if (diffIndex !== -1) {
          results.push({
            sessionId,
            session,
            matchType: 'summary',
            matchText: diff.substring(diffIndex, diffIndex + trimmedQuery.length),
            preview: getContext(diff, diffIndex, trimmedQuery),
          });
          foundInSummary = true;
          break; // Found in summary, move to next session
        }
      }
    }

    if (foundInSummary) {
      continue;
    }

    // Message search - only if includeMessages is enabled and session has userMessages
    if (includeMessages && session.userMessages) {
      for (const messageText of session.userMessages) {
        const lowerMessage = messageText.toLowerCase();
        const messageIndex = lowerMessage.indexOf(lowerQuery);
        if (messageIndex !== -1) {
          results.push({
            sessionId,
            session,
            matchType: 'message',
            matchText: messageText.substring(messageIndex, messageIndex + trimmedQuery.length),
            preview: getContext(messageText, messageIndex, trimmedQuery),
          });
          break; // Found in message, move to next session
        }
      }
    }
  }

  // Sort results by recency (most recent first)
  results.sort((a, b) => b.session.time.created - a.session.time.created);

  return results;
}

/** Debounce delay in milliseconds for search input */
export const DEBOUNCE_MS = 150;

/**
 * Hook for searching across multiple sessions with debouncing.
 */
export function useSessionSearch(
  sessions: Map<string, SessionInfo> | Record<string, SessionInfo>,
  options: SearchOptions = {}
) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);

  // Extract primitive to avoid re-triggers when caller passes inline object
  const includeMessages = options.includeMessages ?? false;

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setResults(searchSessions(query, sessions, { includeMessages }));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, sessions, includeMessages]);

  // Clear search helper
  const clearSearch = useCallback(() => {
    setQuery('');
  }, []);

  // Check if search is active
  const isSearching = useMemo(() => query.trim().length > 0, [query]);

  return {
    query,
    setQuery,
    results,
    clearSearch,
    isSearching,
  };
}
