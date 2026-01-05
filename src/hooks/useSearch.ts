import { useState, useCallback, useMemo } from 'react';
import type { Session, Part } from '../types/session';
import { isTextPart, isToolPart, isReasoningPart, isToolCompleted, isToolError, isAssistantMessage } from '../types/session';

export interface SearchResult {
  messageId: string;
  partId: string;
  type: 'user' | 'assistant' | 'tool' | 'reasoning';
  matchText: string;
  context: string;
}

interface UseSearchReturn {
  searchQuery: string;
  searchResults: SearchResult[];
  isSearching: boolean;
  matchedMessageIds: Set<string>;
  setSearchQuery: (query: string) => void;
  clearSearch: () => void;
}

/**
 * Extract searchable text from a message part.
 */
function getPartText(part: Part): string | null {
  if (isTextPart(part)) {
    return part.text;
  }
  if (isReasoningPart(part)) {
    return part.text;
  }
  if (isToolPart(part)) {
    const texts: string[] = [part.tool];
    if (isToolCompleted(part.state)) {
      if (part.state.title) texts.push(part.state.title);
      if (part.state.output) texts.push(part.state.output);
    }
    if (isToolError(part.state)) {
      texts.push(part.state.error);
    }
    return texts.join(' ');
  }
  return null;
}

/**
 * Get context around a match (surrounding text).
 */
function getContext(text: string, matchIndex: number, contextLength = 50): string {
  const start = Math.max(0, matchIndex - contextLength);
  const end = Math.min(text.length, matchIndex + contextLength);
  
  let context = text.substring(start, end);
  if (start > 0) context = '...' + context;
  if (end < text.length) context = context + '...';
  
  return context.replace(/\n+/g, ' ').trim();
}

/**
 * Search through a session's messages for a query.
 */
function searchSession(session: Session, query: string): SearchResult[] {
  if (!query.trim()) {
    return [];
  }

  const results: SearchResult[] = [];
  const lowerQuery = query.toLowerCase();

  for (const message of session.messages) {
    // Use parentID for assistant messages to align with MessageIndex grouping.
    // If parentID is absent, use the message's own ID.
    const groupMessageId = isAssistantMessage(message) 
      ? (message.info.parentID ?? message.info.id)
      : message.info.id;

    for (const part of message.parts) {
      const text = getPartText(part);
      if (!text) continue;

      const lowerText = text.toLowerCase();
      const matchIndex = lowerText.indexOf(lowerQuery);

      if (matchIndex !== -1) {
        // Determine result type based on message role and part type
        let type: SearchResult['type'] = message.info.role;
        if (isToolPart(part)) type = 'tool';
        if (isReasoningPart(part)) type = 'reasoning';

        results.push({
          messageId: groupMessageId,
          partId: part.id,
          type,
          matchText: text.substring(matchIndex, matchIndex + query.length),
          context: getContext(text, matchIndex),
        });
      }
    }
  }

  return results;
}

/**
 * Hook for managing search state and functionality.
 */
export function useSearch(session: Session | null): UseSearchReturn {
  const [searchQuery, setSearchQuery] = useState('');

  // Compute search results when query or session changes
  // Search is synchronous so no loading state needed
  const searchResults = useMemo(() => {
    if (!session || !searchQuery.trim()) {
      return [];
    }
    return searchSession(session, searchQuery);
  }, [session, searchQuery]);

  // Always false since search is synchronous
  const isSearching = false;

  // Compute set of message IDs that have matches
  const matchedMessageIds = useMemo(() => {
    return new Set(searchResults.map(r => r.messageId));
  }, [searchResults]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  return {
    searchQuery,
    searchResults,
    isSearching,
    matchedMessageIds,
    setSearchQuery,
    clearSearch,
  };
}
