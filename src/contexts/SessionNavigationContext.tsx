import { createContext, useContext, type ReactNode } from 'react';
import type { SessionNode } from '../store/sessionStore';

interface SessionNavigationContextValue {
  /** Child sessions for the currently viewed session */
  childSessions: SessionNode[];
  /** Navigate to a different session */
  navigateToSession: (sessionId: string) => void;
}

const SessionNavigationContext = createContext<SessionNavigationContextValue | null>(null);

interface SessionNavigationProviderProps {
  children: ReactNode;
  childSessions: SessionNode[];
  onNavigateToSession: (sessionId: string) => void;
}

/**
 * Provider for session navigation context.
 * Allows deep components like SubtaskPart to navigate to child sessions.
 */
export function SessionNavigationProvider({
  children,
  childSessions,
  onNavigateToSession,
}: SessionNavigationProviderProps) {
  return (
    <SessionNavigationContext.Provider
      value={{
        childSessions,
        navigateToSession: onNavigateToSession,
      }}
    >
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
