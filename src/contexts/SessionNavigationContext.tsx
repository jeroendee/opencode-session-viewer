import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { SessionInfo } from '../types/session';

interface SessionNavigationContextValue {
  /** All available sessions for matching subtasks to spawned sessions */
  allSessions: Record<string, SessionInfo>;
  /** Navigate to a different session */
  navigateToSession: (sessionId: string) => void;
}

const SessionNavigationContext = createContext<SessionNavigationContextValue | null>(null);

interface SessionNavigationProviderProps {
  children: ReactNode;
  allSessions: Record<string, SessionInfo>;
  onNavigateToSession: (sessionId: string) => void;
}

/**
 * Provider for session navigation context.
 * Allows deep components like SubtaskPart to navigate to spawned sessions.
 */
export function SessionNavigationProvider({
  children,
  allSessions,
  onNavigateToSession,
}: SessionNavigationProviderProps) {
  // Memoize context value to prevent unnecessary rerenders of consumers
  const contextValue = useMemo(
    () => ({
      allSessions,
      navigateToSession: onNavigateToSession,
    }),
    [allSessions, onNavigateToSession]
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
