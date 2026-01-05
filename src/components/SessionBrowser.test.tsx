import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionBrowser } from './SessionBrowser';
import { useSessionStore, type ProjectInfo } from '../store/sessionStore';

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

describe('SessionBrowser', () => {
  const mockSelectSession = vi.fn();
  const mockClearFolder = vi.fn();

  const createMockProjects = (): ProjectInfo[] => [
    {
      id: 'proj-1',
      path: '/Users/test/projects/opencode',
      sessions: [
        {
          session: {
            id: 'session-1',
            version: '1.0',
            projectID: 'proj-1',
            directory: '/Users/test/projects/opencode',
            title: 'Implement feature X',
            time: { created: 1704067200000, updated: 1704067200000 },
          },
          children: [
            {
              session: {
                id: 'session-1-child',
                version: '1.0',
                projectID: 'proj-1',
                directory: '/Users/test/projects/opencode',
                title: 'Explore implementation',
                parentID: 'session-1',
                time: { created: 1704067300000, updated: 1704067300000 },
              },
              children: [],
            },
          ],
        },
        {
          session: {
            id: 'session-2',
            version: '1.0',
            projectID: 'proj-1',
            directory: '/Users/test/projects/opencode',
            title: 'Fix bug Y',
            time: { created: 1704067100000, updated: 1704067100000 },
          },
          children: [],
        },
      ],
    },
    {
      id: 'proj-2',
      path: '/Users/test/projects/other-project',
      sessions: [
        {
          session: {
            id: 'session-3',
            version: '1.0',
            projectID: 'proj-2',
            directory: '/Users/test/projects/other-project',
            title: 'Refactor code',
            time: { created: 1704067000000, updated: 1704067000000 },
          },
          children: [],
        },
      ],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock matchMedia for mobile detection
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false, // Default to desktop
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    vi.mocked(useSessionStore).mockReturnValue({
      projects: createMockProjects(),
      selectedSessionId: null,
      selectSession: mockSelectSession,
      clearFolder: mockClearFolder,
    } as ReturnType<typeof useSessionStore>);
  });

  describe('rendering', () => {
    it('renders the search input', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      expect(screen.getByPlaceholderText('Search sessions...')).toBeInTheDocument();
      expect(screen.getByLabelText('Search sessions')).toBeInTheDocument();
    });

    it('renders project groups with names extracted from paths', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      expect(screen.getByText('opencode')).toBeInTheDocument();
      expect(screen.getByText('other-project')).toBeInTheDocument();
    });

    it('renders session count badges for each project', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // opencode has 3 sessions (2 root + 1 child)
      expect(screen.getByText('3')).toBeInTheDocument();
      // other-project has 1 session
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    it('renders sessions when directory is expanded', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Directories start collapsed by default - sessions should not be visible
      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();

      // Click to expand the opencode directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      // Now sessions should be visible
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('Explore implementation')).toBeInTheDocument();
      expect(screen.getByText('Fix bug Y')).toBeInTheDocument();
    });

    it('renders Change Folder button', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      expect(screen.getByRole('button', { name: 'Change Folder' })).toBeInTheDocument();
    });

    it('shows "No projects loaded" when projects array is empty', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        projects: [],
        selectedSessionId: null,
        selectSession: mockSelectSession,
        clearFolder: mockClearFolder,
      } as ReturnType<typeof useSessionStore>);

      render(<SessionBrowser sidebarOpen={true} />);

      expect(screen.getByText('No sessions loaded')).toBeInTheDocument();
    });

    it('renders the DIRECTORIES header', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      expect(screen.getByText('Directories')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('expands and collapses a directory when clicking on it', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Directories start collapsed - sessions should not be visible
      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();

      // Click to expand the opencode directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      // Sessions from opencode should now be visible
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('Fix bug Y')).toBeInTheDocument();

      // Click to collapse it again
      const collapseButton = screen.getByRole('button', { name: /Collapse opencode/i });
      fireEvent.click(collapseButton);

      // Sessions should be hidden again
      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();
    });

    it('maintains expand state independently for each directory', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Expand opencode
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      // opencode sessions visible
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();

      // other-project sessions still hidden
      expect(screen.queryByText('Refactor code')).not.toBeInTheDocument();

      // Expand other-project
      const otherButton = screen.getByRole('button', { name: /Expand other-project/i });
      fireEvent.click(otherButton);

      // Both directories' sessions now visible
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('Refactor code')).toBeInTheDocument();
    });
  });

  describe('session selection', () => {
    it('calls selectSession when clicking a session', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // First expand the directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      const sessionButton = screen.getByRole('button', { name: 'Implement feature X' });
      fireEvent.click(sessionButton);

      expect(mockSelectSession).toHaveBeenCalledWith('session-1');
    });

    it('calls selectSession for nested child sessions', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // First expand the directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      const childSession = screen.getByRole('button', { name: 'Explore implementation' });
      fireEvent.click(childSession);

      expect(mockSelectSession).toHaveBeenCalledWith('session-1-child');
    });

    it('highlights the selected session with aria-current', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        projects: createMockProjects(),
        selectedSessionId: 'session-1',
        selectSession: mockSelectSession,
        clearFolder: mockClearFolder,
      } as ReturnType<typeof useSessionStore>);

      render(<SessionBrowser sidebarOpen={true} />);

      // First expand the directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      const selectedButton = screen.getByRole('button', { name: 'Implement feature X' });
      expect(selectedButton).toHaveAttribute('aria-current', 'true');

      // Non-selected session should not have aria-current
      const otherButton = screen.getByRole('button', { name: 'Fix bug Y' });
      expect(otherButton).not.toHaveAttribute('aria-current');
    });

    it('calls onCloseSidebar after selecting a session on mobile', () => {
      // Simulate mobile viewport
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(max-width: 767px)', // Mobile viewport
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const mockCloseSidebar = vi.fn();
      render(<SessionBrowser sidebarOpen={true} onCloseSidebar={mockCloseSidebar} />);

      // First expand the directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      const sessionButton = screen.getByRole('button', { name: 'Implement feature X' });
      fireEvent.click(sessionButton);

      expect(mockCloseSidebar).toHaveBeenCalled();
    });

    it('does not call onCloseSidebar after selecting a session on desktop', () => {
      // Default matchMedia mock returns false (desktop)
      const mockCloseSidebar = vi.fn();
      render(<SessionBrowser sidebarOpen={true} onCloseSidebar={mockCloseSidebar} />);

      // First expand the directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);

      const sessionButton = screen.getByRole('button', { name: 'Implement feature X' });
      fireEvent.click(sessionButton);

      expect(mockCloseSidebar).not.toHaveBeenCalled();
    });
  });

  describe('change folder', () => {
    it('calls clearFolder when clicking Change Folder button', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      const changeFolderButton = screen.getByRole('button', { name: 'Change Folder' });
      fireEvent.click(changeFolderButton);

      expect(mockClearFolder).toHaveBeenCalled();
    });
  });

  describe('sidebar visibility', () => {
    it('sets data-open to true when sidebarOpen is true', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      const aside = screen.getByTestId('session-browser');
      expect(aside).toHaveAttribute('data-open', 'true');
    });

    it('sets data-open to false when sidebarOpen is false', () => {
      render(<SessionBrowser sidebarOpen={false} />);

      const aside = screen.getByTestId('session-browser');
      expect(aside).toHaveAttribute('data-open', 'false');
    });
  });

  describe('search input', () => {
    it('renders a disabled search input placeholder for Phase 4', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      const searchInput = screen.getByPlaceholderText('Search sessions...');
      expect(searchInput).toBeDisabled();
    });
  });

  describe('directory expansion sync', () => {
    it('keeps directories collapsed when new ones are added', () => {
      const { rerender } = render(<SessionBrowser sidebarOpen={true} />);

      // Initial state: directories collapsed, sessions not visible
      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();

      // Expand opencode directory
      const opencodeButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(opencodeButton);
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();

      // Add a new project via store update
      const newProjects = [
        ...createMockProjects(),
        {
          id: 'proj-3',
          path: '/Users/test/projects/new-project',
          sessions: [
            {
              session: {
                id: 'session-new',
                version: '1.0',
                projectID: 'proj-3',
                directory: '/Users/test/projects/new-project',
                title: 'New session',
                time: { created: 1704067500000, updated: 1704067500000 },
              },
              children: [],
            },
          ],
        },
      ];

      vi.mocked(useSessionStore).mockReturnValue({
        projects: newProjects,
        selectedSessionId: null,
        selectSession: mockSelectSession,
        clearFolder: mockClearFolder,
      } as ReturnType<typeof useSessionStore>);

      rerender(<SessionBrowser sidebarOpen={true} />);

      // New directory is collapsed, session not visible
      expect(screen.queryByText('New session')).not.toBeInTheDocument();
      // Previously expanded directory still shows its sessions
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
    });
  });

  describe('untitled sessions', () => {
    it('shows "Untitled Session" for sessions without titles', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        projects: [
          {
            id: 'proj-1',
            path: '/test',
            sessions: [
              {
                session: {
                  id: 'session-1',
                  version: '1.0',
                  projectID: 'proj-1',
                  directory: '/test',
                  title: '',
                  time: { created: 1704067200000, updated: 1704067200000 },
                },
                children: [],
              },
            ],
          },
        ],
        selectedSessionId: null,
        selectSession: mockSelectSession,
        clearFolder: mockClearFolder,
      } as ReturnType<typeof useSessionStore>);

      render(<SessionBrowser sidebarOpen={true} />);

      // First expand the directory
      const testButton = screen.getByRole('button', { name: /Expand test/i });
      fireEvent.click(testButton);

      expect(screen.getByText('Untitled Session')).toBeInTheDocument();
    });
  });
});
