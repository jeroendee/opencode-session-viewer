import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react';
import { Search } from 'lucide-react';
import type { SearchResult } from '../hooks/useSessionSearch';

export interface SearchResultsProps {
  results: SearchResult[];
  query: string;
  onSelectSession: (sessionId: string) => void;
}

/**
 * Format a timestamp as "Jan 4, 2025" style.
 */
function formatDateShort(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format file changes as "3 files changed" style.
 */
function formatFileSummary(summary: { files: number } | undefined): string | null {
  if (!summary || summary.files === 0) {
    return null;
  }
  return summary.files === 1 ? '1 file changed' : `${summary.files} files changed`;
}

/**
 * Highlight ALL matching text occurrences in a string.
 * Returns React elements with matches wrapped in <mark> tags.
 * Uses regex with 'i' flag for proper Unicode case-insensitive matching.
 */
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) {
    return text;
  }

  // Escape special regex characters in the query
  const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // Use 'gi' flags for global case-insensitive matching (handles Unicode properly)
  const regex = new RegExp(`(${escapedQuery})`, 'gi');
  const parts = text.split(regex);

  // If no matches, return original text
  if (parts.length === 1) {
    return text;
  }

  // When splitting with a capturing group, odd indices are the captured matches
  return (
    <>
      {parts.map((part, index) => {
        // Odd indices are matches when using split with capturing group
        if (index % 2 === 1) {
          return (
            <mark key={index} className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded px-0.5">
              {part}
            </mark>
          );
        }
        return part;
      })}
    </>
  );
}

/**
 * Renders a single search result item.
 */
function SearchResultItem({
  result,
  query,
  isSelected,
  onClick,
  buttonRef,
}: {
  result: SearchResult;
  query: string;
  isSelected: boolean;
  onClick: () => void;
  buttonRef: (el: HTMLButtonElement | null) => void;
}) {
  const { session, matchType, preview } = result;
  const title = session.title || 'Untitled Session';
  const dateStr = formatDateShort(session.time.created);
  const fileSummary = formatFileSummary(session.summary);

  // Build metadata line
  const metaParts: string[] = [dateStr];
  if (fileSummary) {
    metaParts.push(fileSummary);
  }
  const metaLine = metaParts.join(' \u2022 '); // bullet separator

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={onClick}
      aria-current={isSelected ? 'true' : undefined}
      className={`
        w-full text-left p-3 rounded-lg border transition-colors
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1
        ${isSelected
          ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700'
          : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750'}
      `}
      data-testid="search-result-item"
    >
      {/* Title */}
      <div className="font-medium text-gray-900 dark:text-gray-100 truncate" data-testid="search-result-title">
        {matchType === 'title' ? highlightMatch(title, query) : title}
      </div>

      {/* Meta line: date + file summary */}
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        {metaLine}
      </div>

      {/* Preview snippet */}
      {preview && matchType !== 'title' && (
        <div className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 line-clamp-2" data-testid="search-result-preview">
          &quot;{matchType === 'summary' ? highlightMatch(preview, query) : preview}&quot;
        </div>
      )}
    </button>
  );
}

/**
 * SearchResults - Displays search results with keyboard navigation.
 *
 * Features:
 * - Result count header
 * - Each result shows title, date, file changes, preview snippet
 * - Highlighted matches based on matchType
 * - Click or Enter to navigate to session
 * - Arrow key navigation
 * - Empty state when no results
 */
export function SearchResults({ results, query, onSelectSession }: SearchResultsProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLButtonElement>>(new Map());

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  // Scroll selected item into view
  useEffect(() => {
    const selectedItem = itemRefs.current.get(selectedIndex);
    if (selectedItem) {
      // scrollIntoView may not be available in test environments (jsdom)
      selectedItem.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  const handleSelect = useCallback(
    (sessionId: string) => {
      onSelectSession(sessionId);
    },
    [onSelectSession]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (results.length === 0) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex].sessionId);
          }
          break;
        case 'Home':
          e.preventDefault();
          setSelectedIndex(0);
          break;
        case 'End':
          e.preventDefault();
          setSelectedIndex(results.length - 1);
          break;
      }
    },
    [results, selectedIndex, handleSelect]
  );

  // Empty state
  if (results.length === 0) {
    return (
      <div
        data-testid="search-results-empty"
        className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400"
      >
        <Search className="w-10 h-10 mb-3 opacity-50" />
        <p className="text-sm">No results found</p>
        {query && (
          <p className="text-xs mt-1">
            Try a different search term
          </p>
        )}
      </div>
    );
  }

  const resultCount = results.length;
  const resultLabel = resultCount === 1 ? '1 result' : `${resultCount} results`;

  return (
    <div
      ref={containerRef}
      role="list"
      aria-label="Search results"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="focus:outline-none"
      data-testid="search-results"
    >
      {/* Result count header */}
      <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 font-medium">
        {resultLabel}
      </div>

      {/* Results list */}
      <div className="space-y-2" role="presentation">
        {results.map((result, index) => (
          <SearchResultItem
            key={result.sessionId}
            result={result}
            query={query}
            isSelected={index === selectedIndex}
            onClick={() => handleSelect(result.sessionId)}
            buttonRef={(el) => {
              if (el) {
                itemRefs.current.set(index, el);
              } else {
                itemRefs.current.delete(index);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
