import { create } from 'zustand';
import type { Session, SessionInfo } from '../types/session';
import type { VirtualFileSystem } from '../lib/fileSystem';
import { loadSessionContent, loadUserMessagesForSession } from '../lib/sessionLoader';

/**
 * Represents a session with its child sessions (for branched conversations).
 */
export interface SessionNode {
  session: SessionInfo;
  children: SessionNode[];
}

/**
 * Represents a project (directory) containing multiple sessions.
 */
export interface ProjectInfo {
  id: string;
  path: string; // e.g., '/Users/.../opencode'
  sessions: SessionNode[];
}

interface SessionState {
  // Session data (single session - existing)
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // Multi-session state
  fileSystem: VirtualFileSystem | null;
  projects: ProjectInfo[];
  sessionTree: SessionNode[];
  allSessions: Record<string, SessionInfo>;
  selectedSessionId: string | null;
  isLoadingFolder: boolean;
  isLoadingSession: boolean;
  isLoadingMessages: boolean;
  loadError: string | null;

  // UI state
  sidebarOpen: boolean;

  // Actions (existing - single file loading)
  loadSession: (file: File) => Promise<void>;
  loadSessionFromUrl: (url: string) => Promise<void>;
  loadSessionFromData: (data: Session) => void;
  clearSession: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Multi-session actions
  setFileSystem: (fs: VirtualFileSystem) => void;
  setProjects: (projects: ProjectInfo[]) => void;
  selectSession: (sessionId: string) => Promise<void>;
  loadUserMessages: () => Promise<void>;
  clearFolder: () => void;
}

/**
 * Validates a URL for security before fetching.
 * Only allows https:// URLs to prevent SSRF-like attacks.
 */
function validateUrl(url: string): { valid: boolean; error?: string } {
  try {
    const parsed = new URL(url, window.location.origin);
    
    // Allow relative URLs (same origin)
    if (url.startsWith('/') || url.startsWith('./')) {
      return { valid: true };
    }
    
    // For absolute URLs, only allow https (or http for localhost development)
    if (parsed.protocol === 'https:') {
      return { valid: true };
    }
    
    if (parsed.protocol === 'http:' && parsed.hostname === 'localhost') {
      return { valid: true };
    }
    
    return { 
      valid: false, 
      error: 'Only HTTPS URLs are allowed for security reasons' 
    };
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
}

/**
 * Validates parsed session data structure.
 */
function validateSessionData(data: unknown): data is Session {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const obj = data as Record<string, unknown>;
  
  return (
    typeof obj.info === 'object' &&
    obj.info !== null &&
    Array.isArray(obj.messages)
  );
}

export const useSessionStore = create<SessionState>((set, get) => ({
  // Initial state (single session - existing)
  session: null,
  isLoading: false,
  error: null,

  // Multi-session state
  fileSystem: null,
  projects: [],
  sessionTree: [],
  allSessions: {},
  selectedSessionId: null,
  isLoadingFolder: false,
  isLoadingSession: false,
  isLoadingMessages: false,
  loadError: null,

  // UI state
  sidebarOpen: true,

  // Load session from a File object
  loadSession: async (file: File) => {
    set({ isLoading: true, error: null });

    try {
      const text = await file.text();
      const data: unknown = JSON.parse(text);
      
      if (!validateSessionData(data)) {
        throw new Error('Invalid session format: missing info or messages');
      }

      set({ session: data, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      set({ isLoading: false, error: message });
    }
  },

  // Load session from a URL
  loadSessionFromUrl: async (url: string) => {
    // Validate URL before fetching
    const validation = validateUrl(url);
    if (!validation.valid) {
      set({ error: validation.error ?? 'Invalid URL' });
      return;
    }

    set({ isLoading: true, error: null });

    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      const data: unknown = await response.json();
      
      if (!validateSessionData(data)) {
        throw new Error('Invalid session format: missing info or messages');
      }

      set({ session: data, isLoading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load session';
      set({ isLoading: false, error: message });
    }
  },

  // Load session from already-parsed data
  loadSessionFromData: (data: Session) => {
    set({ session: data, isLoading: false, error: null });
  },

  // Clear the current session
  clearSession: () => {
    set({ session: null, error: null });
  },

  // Clear error state
  clearError: () => {
    set({ error: null });
  },

  // Set error state
  setError: (error: string) => {
    set({ error });
  },

  // Sidebar controls
  setSidebarOpen: (open: boolean) => {
    set({ sidebarOpen: open });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarOpen: !state.sidebarOpen }));
  },

  // Multi-session actions
  setFileSystem: (fs: VirtualFileSystem) => {
    set({ fileSystem: fs });
  },

  setProjects: (projects: ProjectInfo[]) => {
    // Build allSessions record from all projects
    const allSessions: Record<string, SessionInfo> = {};
    const collectSessions = (nodes: SessionNode[]) => {
      for (const node of nodes) {
        allSessions[node.session.id] = node.session;
        collectSessions(node.children);
      }
    };

    for (const project of projects) {
      collectSessions(project.sessions);
    }

    // Build flat sessionTree from all projects
    const sessionTree: SessionNode[] = projects.flatMap((p) => p.sessions);

    set({ projects, allSessions, sessionTree, loadError: null });
  },

  selectSession: async (sessionId: string) => {
    const state = get();
    const sessionInfo = state.allSessions[sessionId];

    if (!sessionInfo) {
      set({ loadError: `Session not found: ${sessionId}` });
      return;
    }

    set({ isLoadingSession: true, loadError: null, selectedSessionId: sessionId });

    try {
      // If we have a file system, load the full session data using lazy loading
      if (state.fileSystem) {
        const session = await loadSessionContent(
          sessionId,
          state.allSessions,
          state.fileSystem
        );

        // Check if user selected a different session while we were loading
        // If so, ignore this result to avoid race condition
        if (get().selectedSessionId !== sessionId) {
          return;
        }

        set({
          session,
          isLoadingSession: false,
          loadError: null,
        });
      } else {
        // No file system - just update the selected session ID
        set({ isLoadingSession: false });
      }
    } catch (err) {
      // Only update error if this is still the selected session
      if (get().selectedSessionId === sessionId) {
        const message = err instanceof Error ? err.message : 'Failed to load session';
        set({ isLoadingSession: false, loadError: message });
      }
    }
  },

  loadUserMessages: async () => {
    const state = get();
    if (!state.fileSystem) {
      return;
    }

    set({ isLoadingMessages: true });

    try {
      const updatedSessions: Record<string, SessionInfo> = {};

      // Load user messages for all sessions in parallel
      const sessionEntries = Object.entries(state.allSessions);
      const results = await Promise.all(
        sessionEntries.map(async ([sessionId, sessionInfo]) => {
          const userMessages = await loadUserMessagesForSession(sessionId, state.fileSystem!);
          return { sessionId, sessionInfo, userMessages };
        })
      );

      // Update sessions with loaded user messages
      for (const { sessionId, sessionInfo, userMessages } of results) {
        updatedSessions[sessionId] = {
          ...sessionInfo,
          userMessages,
        };
      }

      // Helper to update SessionNode tree with new session data
      const updateSessionTree = (nodes: SessionNode[]): SessionNode[] => {
        return nodes.map((node) => ({
          session: updatedSessions[node.session.id] ?? node.session,
          children: updateSessionTree(node.children),
        }));
      };

      // Update allSessions, sessionTree, and projects to keep them all in sync
      set({
        allSessions: updatedSessions,
        sessionTree: updateSessionTree(state.sessionTree),
        projects: state.projects.map((project) => ({
          ...project,
          sessions: updateSessionTree(project.sessions),
        })),
        isLoadingMessages: false,
      });
    } catch (err) {
      console.warn('Failed to load user messages:', err);
      set({ isLoadingMessages: false });
    }
  },

  clearFolder: () => {
    set({
      fileSystem: null,
      projects: [],
      sessionTree: [],
      allSessions: {},
      selectedSessionId: null,
      session: null,
      isLoadingFolder: false,
      isLoadingSession: false,
      isLoadingMessages: false,
      loadError: null,
    });
  },
}));
