import { create } from 'zustand';
import type { Session } from '../types/session';

interface SessionState {
  // Session data
  session: Session | null;
  isLoading: boolean;
  error: string | null;

  // UI state
  sidebarOpen: boolean;

  // Actions
  loadSession: (file: File) => Promise<void>;
  loadSessionFromUrl: (url: string) => Promise<void>;
  loadSessionFromData: (data: Session) => void;
  clearSession: () => void;
  clearError: () => void;
  setError: (error: string) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
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

export const useSessionStore = create<SessionState>((set) => ({
  // Initial state
  session: null,
  isLoading: false,
  error: null,
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
}));
