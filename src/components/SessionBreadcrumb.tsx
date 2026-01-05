import { useCallback } from 'react';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import type { SessionInfo } from '../types/session';

export interface SessionBreadcrumbProps {
  currentSession: SessionInfo;
  allSessions: Record<string, SessionInfo>;
  onNavigate: (sessionId: string) => void;
}

/**
 * Builds a chain of ancestor sessions from the current session.
 * Returns an array of sessions starting from the oldest ancestor to the immediate parent.
 * Does not include the current session.
 * 
 * Includes cycle detection to prevent infinite loops from corrupted data.
 */
function buildBreadcrumbChain(
  currentSession: SessionInfo,
  allSessions: Record<string, SessionInfo>
): SessionInfo[] {
  const chain: SessionInfo[] = [];
  const visited = new Set<string>([currentSession.id]); // Track visited IDs to detect cycles
  let currentId: string | undefined = currentSession.parentID;

  while (currentId) {
    // Cycle detection: if we've already seen this ID, break to prevent infinite loop
    if (visited.has(currentId)) {
      console.warn(`Cycle detected in session parentID chain at session: ${currentId}`);
      break;
    }
    visited.add(currentId);

    const parent: SessionInfo | undefined = allSessions[currentId];
    if (parent) {
      chain.unshift(parent); // Add parent at beginning
      currentId = parent.parentID;
    } else {
      break;
    }
  }

  return chain; // Returns [grandparent, parent] (ancestors only, not current)
}

/**
 * Truncates a title to a max length, adding ellipsis if needed.
 */
function truncateTitle(title: string, maxLength: number = 40): string {
  if (title.length <= maxLength) {
    return title;
  }
  return title.slice(0, maxLength - 1) + '\u2026';
}

/**
 * SessionBreadcrumb - Navigation breadcrumb for child sessions.
 *
 * Shows a breadcrumb chain to navigate back to parent sessions when viewing
 * a sub-agent session. Each ancestor is clickable.
 *
 * Features:
 * - Only renders if currentSession has a parentID
 * - Shows full ancestry chain (grandparent -> parent -> current)
 * - Click any ancestor to navigate to it
 * - Current session is shown but not clickable
 */
export function SessionBreadcrumb({
  currentSession,
  allSessions,
  onNavigate,
}: SessionBreadcrumbProps) {
  const chain = buildBreadcrumbChain(currentSession, allSessions);

  // Simple click handler - buttons handle Enter/Space natively
  const handleNavigate = useCallback(
    (sessionId: string) => () => {
      onNavigate(sessionId);
    },
    [onNavigate]
  );

  // Don't render if no parent (not a child session)
  if (!currentSession.parentID) {
    return null;
  }

  const currentTitle = currentSession.title || 'Untitled Session';

  return (
    <nav
      aria-label="Session breadcrumb"
      className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
      data-testid="session-breadcrumb"
    >
      {/* Back arrow to immediate parent */}
      {chain.length > 0 && (
        <button
          type="button"
          onClick={handleNavigate(chain[chain.length - 1].id)}
          aria-label="Go to parent session"
          className="flex-shrink-0 p-1 -ml-1 mr-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          data-testid="breadcrumb-back-button"
        >
          <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      )}

      {/* Ancestor chain */}
      {chain.map((session, index) => (
        <span key={session.id} className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleNavigate(session.id)}
            className="
              text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300
              hover:underline cursor-pointer transition-colors truncate max-w-[200px]
            "
            title={session.title || 'Untitled Session'}
            data-testid={`breadcrumb-ancestor-${index}`}
          >
            {truncateTitle(session.title || 'Untitled Session')}
          </button>
          <ChevronRight
            className="w-4 h-4 flex-shrink-0 text-gray-400 dark:text-gray-500"
            aria-hidden="true"
          />
        </span>
      ))}

      {/* Current session (not clickable) */}
      <span
        className="text-gray-700 dark:text-gray-300 truncate max-w-[200px]"
        title={currentTitle}
        data-testid="breadcrumb-current"
      >
        {truncateTitle(currentTitle)}
      </span>
    </nav>
  );
}
