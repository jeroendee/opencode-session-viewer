import type { ReactNode } from 'react';

/**
 * Highlights all occurrences of a search query within text.
 * Returns an array of React nodes with matches wrapped in highlighted spans.
 * 
 * @param text - The text to search within
 * @param query - The search query to highlight (case-insensitive)
 * @returns Array of React nodes with highlighted matches, or the original text if no query
 */
export function highlightText(text: string, query: string): ReactNode[] {
  if (!query.trim()) {
    return [text];
  }

  const parts: ReactNode[] = [];
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery);
  let keyIndex = 0;

  while (matchIndex !== -1) {
    // Add text before the match
    if (matchIndex > lastIndex) {
      parts.push(text.substring(lastIndex, matchIndex));
    }

    // Add the highlighted match (preserving original case)
    const matchedText = text.substring(matchIndex, matchIndex + query.length);
    parts.push(
      <mark
        key={`highlight-${keyIndex++}`}
        className="bg-yellow-200 dark:bg-yellow-500/40 text-inherit rounded px-0.5"
      >
        {matchedText}
      </mark>
    );

    lastIndex = matchIndex + query.length;
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text after last match
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Component wrapper for highlighting text with search query.
 * Useful when you need a single ReactNode return type.
 */
interface HighlightedTextProps {
  text: string;
  query: string;
}

export function HighlightedText({ text, query }: HighlightedTextProps) {
  const parts = highlightText(text, query);
  return <>{parts}</>;
}
