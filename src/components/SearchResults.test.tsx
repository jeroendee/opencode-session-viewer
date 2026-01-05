import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SearchResults, type SearchResultsProps } from './SearchResults';
import type { SearchResult } from '../hooks/useSessionSearch';
import type { SessionInfo } from '../types/session';

// Helper to create mock SessionInfo
const createMockSessionInfo = (
  id: string,
  title: string,
  options: {
    created?: number;
    summary?: { additions: number; deletions: number; files: number; diffs?: string[] };
  } = {}
): SessionInfo => ({
  id,
  version: '1.0',
  projectID: 'project-1',
  directory: '/test',
  title,
  time: {
    created: options.created ?? new Date('2025-01-04').getTime(),
    updated: options.created ?? new Date('2025-01-04').getTime(),
  },
  summary: options.summary,
});

// Helper to create mock SearchResult
const createMockSearchResult = (
  sessionId: string,
  session: SessionInfo,
  options: {
    matchType?: 'title' | 'summary' | 'date';
    matchText?: string;
    preview?: string;
  } = {}
): SearchResult => ({
  sessionId,
  session,
  matchType: options.matchType ?? 'title',
  matchText: options.matchText ?? session.title,
  preview: options.preview ?? session.title,
});

describe('SearchResults', () => {
  const mockOnSelectSession = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderSearchResults = (props: Partial<SearchResultsProps> = {}) => {
    const defaultProps: SearchResultsProps = {
      results: [],
      query: '',
      onSelectSession: mockOnSelectSession,
      ...props,
    };
    return render(<SearchResults {...defaultProps} />);
  };

  describe('empty state', () => {
    it('displays empty state when no results', () => {
      renderSearchResults({ results: [], query: 'test' });

      expect(screen.getByTestId('search-results-empty')).toBeInTheDocument();
      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.getByText('Try a different search term')).toBeInTheDocument();
    });

    it('does not show "try different search" when query is empty', () => {
      renderSearchResults({ results: [], query: '' });

      expect(screen.getByText('No results found')).toBeInTheDocument();
      expect(screen.queryByText('Try a different search term')).not.toBeInTheDocument();
    });
  });

  describe('result count header', () => {
    it('displays singular "1 result" for single result', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByText('1 result')).toBeInTheDocument();
    });

    it('displays plural "N results" for multiple results', () => {
      const session1 = createMockSessionInfo('session-1', 'Test Session 1');
      const session2 = createMockSessionInfo('session-2', 'Test Session 2');
      const session3 = createMockSessionInfo('session-3', 'Test Session 3');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
        createMockSearchResult('session-3', session3),
      ];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByText('3 results')).toBeInTheDocument();
    });
  });

  describe('result item display', () => {
    it('displays session title', () => {
      const session = createMockSessionInfo('session-1', 'Implement user metrics feature');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'metrics' });

      // Find the title container using data-testid
      const titleContainer = screen.getByTestId('search-result-title');
      expect(titleContainer).toHaveTextContent('Implement user metrics feature');
    });

    it('displays "Untitled Session" for sessions without titles', () => {
      const session = createMockSessionInfo('session-1', '');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByText('Untitled Session')).toBeInTheDocument();
    });

    it('displays formatted date', () => {
      const session = createMockSessionInfo('session-1', 'Test Session', {
        created: new Date('2025-01-04').getTime(),
      });
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByText(/Jan 4, 2025/)).toBeInTheDocument();
    });

    it('displays file change summary when available', () => {
      const session = createMockSessionInfo('session-1', 'Test Session', {
        summary: { additions: 10, deletions: 5, files: 3 },
      });
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByText(/3 files changed/)).toBeInTheDocument();
    });

    it('displays "1 file changed" for single file', () => {
      const session = createMockSessionInfo('session-1', 'Test Session', {
        summary: { additions: 5, deletions: 2, files: 1 },
      });
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByText(/1 file changed/)).toBeInTheDocument();
    });

    it('does not display file summary when no files changed', () => {
      const session = createMockSessionInfo('session-1', 'Test Session', {
        summary: { additions: 0, deletions: 0, files: 0 },
      });
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.queryByText(/files? changed/)).not.toBeInTheDocument();
    });

    it('displays preview snippet for summary matches', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [
        createMockSearchResult('session-1', session, {
          matchType: 'summary',
          preview: '...tracking and export them...',
        }),
      ];

      renderSearchResults({ results, query: 'tracking' });

      // Find the preview container using data-testid
      const previewContainer = screen.getByTestId('search-result-preview');
      expect(previewContainer).toHaveTextContent('tracking and export them');
    });

    it('does not display preview for title matches', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [
        createMockSearchResult('session-1', session, {
          matchType: 'title',
          preview: 'Some preview text',
        }),
      ];

      renderSearchResults({ results, query: 'test' });

      // Preview should not be rendered for title matches
      expect(screen.queryByText(/"Some preview text"/)).not.toBeInTheDocument();
    });
  });

  describe('text highlighting', () => {
    it('highlights matching text in title for title matches', () => {
      const session = createMockSessionInfo('session-1', 'Implement metrics feature');
      const results = [
        createMockSearchResult('session-1', session, {
          matchType: 'title',
        }),
      ];

      renderSearchResults({ results, query: 'metrics' });

      // The mark element should exist for the highlighted text
      const markElement = screen.getByText('metrics');
      expect(markElement.tagName.toLowerCase()).toBe('mark');
    });

    it('highlights matching text in preview for summary matches', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [
        createMockSearchResult('session-1', session, {
          matchType: 'summary',
          preview: 'tracking and export data',
        }),
      ];

      renderSearchResults({ results, query: 'export' });

      const markElement = screen.getByText('export');
      expect(markElement.tagName.toLowerCase()).toBe('mark');
    });

    it('is case-insensitive when highlighting', () => {
      const session = createMockSessionInfo('session-1', 'Implement METRICS Feature');
      const results = [
        createMockSearchResult('session-1', session, {
          matchType: 'title',
        }),
      ];

      renderSearchResults({ results, query: 'metrics' });

      // Should highlight "METRICS" even though query is lowercase
      const markElement = screen.getByText('METRICS');
      expect(markElement.tagName.toLowerCase()).toBe('mark');
    });
  });

  describe('click selection', () => {
    it('calls onSelectSession when clicking a result', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      const resultItem = screen.getByTestId('search-result-item');
      fireEvent.click(resultItem);

      expect(mockOnSelectSession).toHaveBeenCalledWith('session-1');
    });

    it('calls onSelectSession with correct sessionId for multiple results', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const resultItems = screen.getAllByTestId('search-result-item');
      fireEvent.click(resultItems[1]);

      expect(mockOnSelectSession).toHaveBeenCalledWith('session-2');
    });
  });

  describe('keyboard navigation', () => {
    it('first item is selected by default', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[0]).toHaveAttribute('aria-current', 'true');
      expect(resultItems[1]).not.toHaveAttribute('aria-current');
    });

    it('moves selection down with ArrowDown', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'ArrowDown' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[0]).not.toHaveAttribute('aria-current');
      expect(resultItems[1]).toHaveAttribute('aria-current', 'true');
    });

    it('moves selection up with ArrowUp', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      // Move down first, then up
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'ArrowUp' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[0]).toHaveAttribute('aria-current', 'true');
      expect(resultItems[1]).not.toHaveAttribute('aria-current');
    });

    it('does not go below last item with ArrowDown', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'ArrowDown' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[1]).toHaveAttribute('aria-current', 'true');
    });

    it('does not go above first item with ArrowUp', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'ArrowUp' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[0]).toHaveAttribute('aria-current', 'true');
    });

    it('selects session with Enter key', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'Enter' });

      expect(mockOnSelectSession).toHaveBeenCalledWith('session-2');
    });

    it('jumps to first item with Home key', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const session3 = createMockSessionInfo('session-3', 'Third Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
        createMockSearchResult('session-3', session3),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      fireEvent.keyDown(container, { key: 'Home' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[0]).toHaveAttribute('aria-current', 'true');
    });

    it('jumps to last item with End key', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const session3 = createMockSessionInfo('session-3', 'Third Session');
      const results = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
        createMockSearchResult('session-3', session3),
      ];

      renderSearchResults({ results, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'End' });

      const resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[2]).toHaveAttribute('aria-current', 'true');
    });

    it('resets selection when results change', () => {
      const session1 = createMockSessionInfo('session-1', 'First Session');
      const session2 = createMockSessionInfo('session-2', 'Second Session');
      const results1 = [
        createMockSearchResult('session-1', session1),
        createMockSearchResult('session-2', session2),
      ];

      const { rerender } = renderSearchResults({ results: results1, query: 'session' });

      const container = screen.getByTestId('search-results');
      fireEvent.keyDown(container, { key: 'ArrowDown' });

      // Verify second item is selected
      let resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[1]).toHaveAttribute('aria-current', 'true');

      // Change results
      const session3 = createMockSessionInfo('session-3', 'Third Session');
      const results2 = [
        createMockSearchResult('session-3', session3),
        createMockSearchResult('session-1', session1),
      ];

      rerender(
        <SearchResults
          results={results2}
          query="session"
          onSelectSession={mockOnSelectSession}
        />
      );

      // First item should be selected after results change
      resultItems = screen.getAllByTestId('search-result-item');
      expect(resultItems[0]).toHaveAttribute('aria-current', 'true');
    });
  });

  describe('accessibility', () => {
    it('has list role for the results container', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('has aria-label on the results container', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      expect(screen.getByRole('list')).toHaveAttribute('aria-label', 'Search results');
    });

    it('results container is keyboard focusable', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      const container = screen.getByTestId('search-results');
      expect(container).toHaveAttribute('tabIndex', '0');
    });

    it('individual results are buttons', () => {
      const session = createMockSessionInfo('session-1', 'Test Session');
      const results = [createMockSearchResult('session-1', session)];

      renderSearchResults({ results, query: 'test' });

      const resultItem = screen.getByTestId('search-result-item');
      expect(resultItem.tagName.toLowerCase()).toBe('button');
    });
  });

  describe('date match display', () => {
    it('displays preview for date matches', () => {
      const session = createMockSessionInfo('session-1', 'Test Session', {
        created: new Date('2025-01-04').getTime(),
      });
      const results = [
        createMockSearchResult('session-1', session, {
          matchType: 'date',
          preview: 'Sat, Jan 4, 2025',
        }),
      ];

      renderSearchResults({ results, query: 'today' });

      // Date matches should show the preview using data-testid
      const previewContainer = screen.getByTestId('search-result-preview');
      expect(previewContainer).toHaveTextContent('Sat, Jan 4, 2025');
    });
  });
});
