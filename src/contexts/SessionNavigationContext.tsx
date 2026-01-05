import { createContext, useContext, useMemo, useCallback, type ReactNode } from 'react';
import type { Session, SessionInfo } from '../types/session';
import type { VirtualFileSystem } from '../lib/fileSystem';
import { loadSessionContent } from '../lib/sessionLoader';

interface SessionNavigationContextValue {
  /** All available sessions for matching subtasks to spawned sessions */
  allSessions: Record<string, SessionInfo>;
  /** Navigate to a different session */
  navigateToSession: (sessionId: string) => void;
  /** Load full session content for inline viewing */
  loadSession: (sessionId: string) => Promise<Session>;
}

const SessionNavigationContext = createContext<SessionNavigationContextValue | null>(null);

interface SessionNavigationProviderProps {
  children: ReactNode;
  allSessions: Record<string, SessionInfo>;
  fileSystem: VirtualFileSystem | null;
  onNavigateToSession: (sessionId: string) => void;
}

/**
 * Provider for session navigation context.
 * Allows deep components like SubtaskPart to navigate to spawned sessions.
 */
export function SessionNavigationProvider({
  children,
  allSessions,
  fileSystem,
  onNavigateToSession,
}: SessionNavigationProviderProps) {
  // Load session content for inline viewing
  const loadSession = useCallback(async (sessionId: string): Promise<Session> => {
    if (!fileSystem) {
      throw new Error('File system not available');
    }
    return loadSessionContent(sessionId, allSessions, fileSystem);
  }, [allSessions, fileSystem]);

  // Memoize context value to prevent unnecessary rerenders of consumers
  const contextValue = useMemo(
    () => ({
      allSessions,
      navigateToSession: onNavigateToSession,
      loadSession,
    }),
    [allSessions, onNavigateToSession, loadSession]
  );

  return (
    <SessionNavigationContext.Provider value={contextValue}>
      {children}
    </SessionNavigationContext.Provider>
  );
}

/**
 * Hook to access session navigation from deep components.
 * Returns null if not within a SessionNavigationProvider.
 */
export function useSessionNavigation(): SessionNavigationContextValue | null {
  return useContext(SessionNavigationContext);
}
