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

    it('renders sessions when project is expanded', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Projects start expanded by default
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('Explore implementation')).toBeInTheDocument();
      expect(screen.getByText('Fix bug Y')).toBeInTheDocument();
      expect(screen.getByText('Refactor code')).toBeInTheDocument();
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

      expect(screen.getByText('No projects loaded')).toBeInTheDocument();
    });

    it('renders the PROJECTS header', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      expect(screen.getByText('Projects')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('collapses a project when clicking on it', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Sessions should be visible initially
      expect(screen.getByText('Implement feature X')).toBeInTheDocument();

      // Click to collapse the opencode project
      const opencodeButton = screen.getByRole('button', { name: /Collapse opencode/i });
      fireEvent.click(opencodeButton);

      // Sessions from opencode should be hidden
      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();
      expect(screen.queryByText('Fix bug Y')).not.toBeInTheDocument();

      // Sessions from other-project should still be visible
      expect(screen.getByText('Refactor code')).toBeInTheDocument();
    });

    it('expands a collapsed project when clicking on it', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Collapse first
      const opencodeButton = screen.getByRole('button', { name: /Collapse opencode/i });
      fireEvent.click(opencodeButton);

      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();

      // Expand again
      const expandButton = screen.getByRole('button', { name: /Expand opencode/i });
      fireEvent.click(expandButton);

      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
    });

    it('maintains expand state independently for each project', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      // Collapse opencode
      const opencodeButton = screen.getByRole('button', { name: /Collapse opencode/i });
      fireEvent.click(opencodeButton);

      // opencode sessions hidden
      expect(screen.queryByText('Implement feature X')).not.toBeInTheDocument();

      // other-project sessions still visible
      expect(screen.getByText('Refactor code')).toBeInTheDocument();

      // Collapse other-project
      const otherButton = screen.getByRole('button', { name: /Collapse other-project/i });
      fireEvent.click(otherButton);

      // other-project sessions now hidden
      expect(screen.queryByText('Refactor code')).not.toBeInTheDocument();
    });
  });

  describe('session selection', () => {
    it('calls selectSession when clicking a session', () => {
      render(<SessionBrowser sidebarOpen={true} />);

      const sessionButton = screen.getByRole('button', { name: 'Implement feature X' });
      fireEvent.click(sessionButton);

      expect(mockSelectSession).toHaveBeenCalledWith('session-1');
    });

    it('calls selectSession for nested child sessions', () => {
      render(<SessionBrowser sidebarOpen={true} />);

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

      const selectedButton = screen.getByRole('button', { name: 'Implement feature X' });
      expect(selectedButton).toHaveAttribute('aria-current', 'true');

      // Non-selected session should not have aria-current
      const otherButton = screen.getByRole('button', { name: 'Fix bug Y' });
      expect(otherButton).not.toHaveAttribute('aria-current');
    });

    it('calls onCloseSidebar after selecting a session', () => {
      const mockCloseSidebar = vi.fn();
      render(<SessionBrowser sidebarOpen={true} onCloseSidebar={mockCloseSidebar} />);

      const sessionButton = screen.getByRole('button', { name: 'Implement feature X' });
      fireEvent.click(sessionButton);

      expect(mockCloseSidebar).toHaveBeenCalled();
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

  describe('project expansion sync', () => {
    it('expands new projects when they are added', () => {
      const { rerender } = render(<SessionBrowser sidebarOpen={true} />);

      // Initial state: sessions visible
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

      // New project should be expanded by default
      expect(screen.getByText('New session')).toBeInTheDocument();
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

      expect(screen.getByText('Untitled Session')).toBeInTheDocument();
    });
  });
});
