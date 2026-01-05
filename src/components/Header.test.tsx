import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Header } from './Header';
import { useSessionStore } from '../store/sessionStore';
import type { Session } from '../types/session';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock the session store
vi.mock('../store/sessionStore', async () => {
  const actual = await vi.importActual<typeof import('../store/sessionStore')>(
    '../store/sessionStore'
  );
  return {
    ...actual,
    useSessionStore: vi.fn(),
  };
});

// Mock clipboard API
const mockWriteText = vi.fn();

describe('Header', () => {
  const mockToggleSidebar = vi.fn();

  const createMockSession = (): Session => ({
    info: {
      id: 'session-abc-123-xyz',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/Users/test/projects/myproject',
      title: 'Implement feature X',
      time: { created: 1704067200000, updated: 1704153600000 },
    },
    messages: [
      {
        info: {
          id: 'msg-1',
          sessionID: 'session-abc-123-xyz',
          role: 'assistant',
          parentID: 'user-msg-1',
          time: { created: 1704067200000 },
          modelID: 'claude-3-opus',
          providerID: 'anthropic',
          agent: 'coder',
          mode: 'default',
          path: { cwd: '/test', root: '/test' },
          cost: 0.05,
          tokens: {
            input: 1000,
            output: 500,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
        },
        parts: [],
      },
    ],
  });

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  describe('without session', () => {
    beforeEach(() => {
      vi.mocked(useSessionStore).mockReturnValue({
        session: null,
        sidebarOpen: true,
        toggleSidebar: mockToggleSidebar,
      } as unknown as ReturnType<typeof useSessionStore>);
    });

    it('renders default title when no session is loaded', () => {
      render(<Header />);
      expect(screen.getByText('OpenCode Session Viewer')).toBeInTheDocument();
    });

    it('does not show session ID or date when no session is loaded', () => {
      render(<Header />);
      expect(screen.queryByText(/ID:/)).not.toBeInTheDocument();
    });
  });

  describe('with session', () => {
    beforeEach(() => {
      vi.mocked(useSessionStore).mockReturnValue({
        session: createMockSession(),
        sidebarOpen: true,
        toggleSidebar: mockToggleSidebar,
      } as unknown as ReturnType<typeof useSessionStore>);
    });

    it('renders session title when session is loaded', () => {
      render(<Header />);
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
    });

    it('renders session directory', () => {
      render(<Header />);
      expect(screen.getByText('/Users/test/projects/myproject')).toBeInTheDocument();
    });

    it('displays session ID with copy functionality', () => {
      render(<Header />);
      
      // Session ID should be visible (rendered twice: desktop and mobile)
      const sessionIds = screen.getAllByText('session-abc-123-xyz');
      expect(sessionIds.length).toBeGreaterThan(0);
      expect(sessionIds[0]).toBeInTheDocument();
    });

    it('copies session ID when clicking the copy button', async () => {
      render(<Header />);
      
      // Find the buttons containing the session ID (rendered twice: desktop and mobile)
      const copyButtons = screen.getAllByRole('button', { name: /Copy session ID/i });
      
      await act(async () => {
        fireEvent.click(copyButtons[0]);
      });

      expect(mockWriteText).toHaveBeenCalledWith('session-abc-123-xyz');
    });

    it('shows success feedback after copying', async () => {
      render(<Header />);
      
      const copyButtons = screen.getAllByRole('button', { name: /Copy session ID/i });
      const copyButton = copyButtons[0];
      
      await act(async () => {
        fireEvent.click(copyButton);
      });

      // After clicking, aria-label should change to indicate success
      expect(copyButton).toHaveAttribute('aria-label', 'Session ID copied to clipboard');
    });

    it('resets copy feedback after timeout', async () => {
      render(<Header />);
      
      const copyButtons = screen.getAllByRole('button', { name: /Copy session ID/i });
      const copyButton = copyButtons[0];
      
      await act(async () => {
        fireEvent.click(copyButton);
      });

      expect(copyButton).toHaveAttribute('aria-label', 'Session ID copied to clipboard');

      act(() => {
        vi.advanceTimersByTime(2000);
      });

      expect(copyButton).toHaveAttribute('aria-label', 'Copy session ID: session-abc-123-xyz');
    });

    it('displays formatted session date', () => {
      render(<Header />);
      
      // Should show the updated date in some formatted form (rendered twice: desktop and mobile)
      // The exact format depends on locale, but it should contain the date
      const dateElements = screen.getAllByText(/Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/);
      expect(dateElements.length).toBeGreaterThan(0);
      expect(dateElements[0]).toBeInTheDocument();
    });
  });

  describe('sidebar toggle', () => {
    it('calls toggleSidebar when clicking sidebar button', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        session: null,
        sidebarOpen: true,
        toggleSidebar: mockToggleSidebar,
      } as unknown as ReturnType<typeof useSessionStore>);

      render(<Header />);
      
      const toggleButton = screen.getByRole('button', { name: /Close sidebar/i });
      fireEvent.click(toggleButton);

      expect(mockToggleSidebar).toHaveBeenCalled();
    });

    it('shows "Open sidebar" label when sidebar is closed', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        session: null,
        sidebarOpen: false,
        toggleSidebar: mockToggleSidebar,
      } as unknown as ReturnType<typeof useSessionStore>);

      render(<Header />);
      
      expect(screen.getByRole('button', { name: /Open sidebar/i })).toBeInTheDocument();
    });
  });
});
