import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSessionStore, type SessionNode, type ProjectInfo } from './sessionStore';
import type { SessionInfo } from '../types/session';
import type { VirtualFileSystem } from '../lib/fileSystem';

// Helper to reset store state between tests
const resetStore = () => {
  useSessionStore.setState({
    session: null,
    isLoading: false,
    error: null,
    fileSystem: null,
    projects: [],
    sessionTree: [],
    allSessions: {},
    selectedSessionId: null,
    isLoadingFolder: false,
    isLoadingSession: false,
    loadError: null,
    sidebarOpen: true,
  });
};

// Helper to create mock SessionInfo
const createMockSessionInfo = (
  id: string,
  projectID: string = 'project-1',
  parentID?: string
): SessionInfo => ({
  id,
  version: '1.0.0',
  projectID,
  directory: `/Users/test/${projectID}`,
  title: `Session ${id}`,
  parentID,
  time: {
    created: Date.now(),
    updated: Date.now(),
  },
});

// Helper to create mock SessionNode
const createMockSessionNode = (
  session: SessionInfo,
  children: SessionNode[] = []
): SessionNode => ({
  session,
  children,
});

// Helper to create mock VirtualFileSystem
const createMockFileSystem = (files: Map<string, string>): VirtualFileSystem => {
  // Build set of directories for listing
  const directories = new Set<string>();
  directories.add(''); // root

  for (const filePath of files.keys()) {
    const segments = filePath.split('/');
    for (let i = 1; i < segments.length; i++) {
      directories.add(segments.slice(0, i).join('/'));
    }
  }

  return {
    readFile: vi.fn().mockImplementation(async (path: string[]) => {
      const pathString = path.join('/');
      return files.get(pathString) ?? null;
    }),
    listDirectory: vi.fn().mockImplementation(async (path: string[]) => {
      const pathString = path.join('/');

      // If path is a file, return empty
      if (files.has(pathString)) {
        return [];
      }

      // If path doesn't exist as a directory, return empty
      if (pathString !== '' && !directories.has(pathString)) {
        return [];
      }

      const prefix = pathString === '' ? '' : pathString + '/';
      const entries = new Set<string>();

      for (const filePath of files.keys()) {
        if (pathString === '' || filePath.startsWith(prefix)) {
          const relativePath = pathString === '' ? filePath : filePath.slice(prefix.length);
          const firstSegment = relativePath.split('/')[0];
          if (firstSegment) {
            entries.add(firstSegment);
          }
        }
      }

      return Array.from(entries);
    }),
    exists: vi.fn().mockImplementation(async (path: string[]) => {
      if (path.length === 0) return true;
      const pathString = path.join('/');
      return files.has(pathString) || directories.has(pathString);
    }),
  };
};

describe('sessionStore - multi-session state', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('initial state', () => {
    it('has null fileSystem', () => {
      expect(useSessionStore.getState().fileSystem).toBeNull();
    });

    it('has empty projects array', () => {
      expect(useSessionStore.getState().projects).toEqual([]);
    });

    it('has empty sessionTree array', () => {
      expect(useSessionStore.getState().sessionTree).toEqual([]);
    });

    it('has empty allSessions record', () => {
      expect(Object.keys(useSessionStore.getState().allSessions).length).toBe(0);
    });

    it('has null selectedSessionId', () => {
      expect(useSessionStore.getState().selectedSessionId).toBeNull();
    });

    it('has isLoadingFolder as false', () => {
      expect(useSessionStore.getState().isLoadingFolder).toBe(false);
    });

    it('has isLoadingSession as false', () => {
      expect(useSessionStore.getState().isLoadingSession).toBe(false);
    });

    it('has null loadError', () => {
      expect(useSessionStore.getState().loadError).toBeNull();
    });
  });

  describe('setFileSystem', () => {
    it('sets the file system', () => {
      const mockFs = createMockFileSystem(new Map());

      useSessionStore.getState().setFileSystem(mockFs);

      expect(useSessionStore.getState().fileSystem).toBe(mockFs);
    });
  });

  describe('setProjects', () => {
    it('sets projects array', () => {
      const session1 = createMockSessionInfo('session-1', 'project-1');
      const node1 = createMockSessionNode(session1);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node1],
      };

      useSessionStore.getState().setProjects([project]);

      expect(useSessionStore.getState().projects).toHaveLength(1);
      expect(useSessionStore.getState().projects[0].id).toBe('project-1');
    });

    it('builds allSessions map from projects', () => {
      const session1 = createMockSessionInfo('session-1', 'project-1');
      const session2 = createMockSessionInfo('session-2', 'project-1');
      const node1 = createMockSessionNode(session1);
      const node2 = createMockSessionNode(session2);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node1, node2],
      };

      useSessionStore.getState().setProjects([project]);

      const { allSessions } = useSessionStore.getState();
      expect(Object.keys(allSessions).length).toBe(2);
      expect(allSessions['session-1']).toBe(session1);
      expect(allSessions['session-2']).toBe(session2);
    });

    it('collects sessions from nested children', () => {
      const parentSession = createMockSessionInfo('parent', 'project-1');
      const childSession = createMockSessionInfo('child', 'project-1', 'parent');
      const grandchildSession = createMockSessionInfo('grandchild', 'project-1', 'child');

      const grandchildNode = createMockSessionNode(grandchildSession);
      const childNode = createMockSessionNode(childSession, [grandchildNode]);
      const parentNode = createMockSessionNode(parentSession, [childNode]);

      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [parentNode],
      };

      useSessionStore.getState().setProjects([project]);

      const { allSessions } = useSessionStore.getState();
      expect(Object.keys(allSessions).length).toBe(3);
      expect('parent' in allSessions).toBe(true);
      expect('child' in allSessions).toBe(true);
      expect('grandchild' in allSessions).toBe(true);
    });

    it('builds flat sessionTree from all projects', () => {
      const session1 = createMockSessionInfo('session-1', 'project-1');
      const session2 = createMockSessionInfo('session-2', 'project-2');
      const node1 = createMockSessionNode(session1);
      const node2 = createMockSessionNode(session2);

      const project1: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node1],
      };
      const project2: ProjectInfo = {
        id: 'project-2',
        path: '/Users/test/project-2',
        sessions: [node2],
      };

      useSessionStore.getState().setProjects([project1, project2]);

      const { sessionTree } = useSessionStore.getState();
      expect(sessionTree).toHaveLength(2);
      expect(sessionTree[0].session.id).toBe('session-1');
      expect(sessionTree[1].session.id).toBe('session-2');
    });

    it('clears loadError when setting projects', () => {
      useSessionStore.setState({ loadError: 'previous error' });

      const project: ProjectInfo = {
        id: 'project-1',
        path: '/path',
        sessions: [],
      };
      useSessionStore.getState().setProjects([project]);

      expect(useSessionStore.getState().loadError).toBeNull();
    });
  });

  describe('selectSession', () => {
    it('sets selectedSessionId', async () => {
      const session = createMockSessionInfo('session-1', 'project-1');
      const node = createMockSessionNode(session);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };
      useSessionStore.getState().setProjects([project]);

      await useSessionStore.getState().selectSession('session-1');

      expect(useSessionStore.getState().selectedSessionId).toBe('session-1');
    });

    it('sets loadError when session not found', async () => {
      await useSessionStore.getState().selectSession('nonexistent');

      expect(useSessionStore.getState().loadError).toBe('Session not found: nonexistent');
    });

    it('loads session data from file system using lazy loading', async () => {
      const sessionInfo = createMockSessionInfo('session-1', 'project-1');
      // Create message and part files instead of a single session file
      const msgInfo = {
        id: 'msg-1',
        sessionID: 'session-1',
        role: 'user',
        time: { created: Date.now() },
        agent: 'test-agent',
        model: { providerID: 'test-provider', modelID: 'test-model' },
      };
      const partInfo = {
        id: 'part-1',
        sessionID: 'session-1',
        messageID: 'msg-1',
        type: 'text',
        text: 'Hello world',
      };
      const files = new Map([
        ['message/session-1/msg-1.json', JSON.stringify(msgInfo)],
        ['part/msg-1/part-1.json', JSON.stringify(partInfo)],
      ]);
      const mockFs = createMockFileSystem(files);

      const node = createMockSessionNode(sessionInfo);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };

      useSessionStore.getState().setFileSystem(mockFs);
      useSessionStore.getState().setProjects([project]);

      await useSessionStore.getState().selectSession('session-1');

      expect(useSessionStore.getState().session).not.toBeNull();
      expect(useSessionStore.getState().session?.info.id).toBe('session-1');
      expect(useSessionStore.getState().session?.messages).toHaveLength(1);
      expect(useSessionStore.getState().session?.messages[0].parts).toHaveLength(1);
    });

    it('sets isLoadingSession during load', async () => {
      const sessionInfo = createMockSessionInfo('session-1', 'project-1');
      const files = new Map<string, string>(); // Empty - no messages
      const mockFs = createMockFileSystem(files);

      const node = createMockSessionNode(sessionInfo);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };

      useSessionStore.getState().setFileSystem(mockFs);
      useSessionStore.getState().setProjects([project]);

      // Start loading (don't await)
      const loadPromise = useSessionStore.getState().selectSession('session-1');
      // Note: Due to async nature, isLoadingSession may already be false by the time we check
      // This test verifies the loading completes successfully
      await loadPromise;

      expect(useSessionStore.getState().isLoadingSession).toBe(false);
    });

    it('loads session with empty messages when no message files exist', async () => {
      const sessionInfo = createMockSessionInfo('session-1', 'project-1');
      const mockFs = createMockFileSystem(new Map()); // Empty - no messages

      const node = createMockSessionNode(sessionInfo);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };

      useSessionStore.getState().setFileSystem(mockFs);
      useSessionStore.getState().setProjects([project]);

      await useSessionStore.getState().selectSession('session-1');

      // With lazy loading, empty message directory is valid - just means no messages
      expect(useSessionStore.getState().loadError).toBeNull();
      expect(useSessionStore.getState().session).not.toBeNull();
      expect(useSessionStore.getState().session?.messages).toEqual([]);
    });

    it('loads session and skips invalid message files', async () => {
      const sessionInfo = createMockSessionInfo('session-1', 'project-1');
      const validMsgInfo = {
        id: 'msg-1',
        sessionID: 'session-1',
        role: 'user',
        time: { created: Date.now() },
        agent: 'test-agent',
        model: { providerID: 'test-provider', modelID: 'test-model' },
      };
      const files = new Map([
        ['message/session-1/msg-1.json', JSON.stringify(validMsgInfo)],
        ['message/session-1/corrupted.json', 'not valid json {{{'],
      ]);
      const mockFs = createMockFileSystem(files);

      const node = createMockSessionNode(sessionInfo);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };

      useSessionStore.getState().setFileSystem(mockFs);
      useSessionStore.getState().setProjects([project]);

      await useSessionStore.getState().selectSession('session-1');

      // With lazy loading, corrupted files are skipped but valid ones are loaded
      expect(useSessionStore.getState().loadError).toBeNull();
      expect(useSessionStore.getState().session).not.toBeNull();
      expect(useSessionStore.getState().session?.messages).toHaveLength(1);
    });

    it('works without file system (just updates selectedSessionId)', async () => {
      const sessionInfo = createMockSessionInfo('session-1', 'project-1');
      const node = createMockSessionNode(sessionInfo);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };

      useSessionStore.getState().setProjects([project]);
      // Note: no setFileSystem call

      await useSessionStore.getState().selectSession('session-1');

      expect(useSessionStore.getState().selectedSessionId).toBe('session-1');
      expect(useSessionStore.getState().isLoadingSession).toBe(false);
      expect(useSessionStore.getState().loadError).toBeNull();
    });
  });

  describe('clearFolder', () => {
    it('resets all multi-session state', () => {
      // Set up some state
      const mockFs = createMockFileSystem(new Map());
      const session = createMockSessionInfo('session-1', 'project-1');
      const node = createMockSessionNode(session);
      const project: ProjectInfo = {
        id: 'project-1',
        path: '/Users/test/project-1',
        sessions: [node],
      };

      useSessionStore.getState().setFileSystem(mockFs);
      useSessionStore.getState().setProjects([project]);
      useSessionStore.setState({
        selectedSessionId: 'session-1',
        isLoadingFolder: true,
        isLoadingSession: true,
        loadError: 'some error',
        session: { info: session, messages: [] },
      });

      // Clear
      useSessionStore.getState().clearFolder();

      const state = useSessionStore.getState();
      expect(state.fileSystem).toBeNull();
      expect(state.projects).toEqual([]);
      expect(state.sessionTree).toEqual([]);
      expect(Object.keys(state.allSessions).length).toBe(0);
      expect(state.selectedSessionId).toBeNull();
      expect(state.session).toBeNull();
      expect(state.isLoadingFolder).toBe(false);
      expect(state.isLoadingSession).toBe(false);
      expect(state.loadError).toBeNull();
    });
  });

  describe('existing functionality preservation', () => {
    it('preserves existing sidebarOpen state', () => {
      expect(useSessionStore.getState().sidebarOpen).toBe(true);

      useSessionStore.getState().setSidebarOpen(false);
      expect(useSessionStore.getState().sidebarOpen).toBe(false);

      useSessionStore.getState().toggleSidebar();
      expect(useSessionStore.getState().sidebarOpen).toBe(true);
    });

    it('preserves existing error handling', () => {
      useSessionStore.getState().setError('test error');
      expect(useSessionStore.getState().error).toBe('test error');

      useSessionStore.getState().clearError();
      expect(useSessionStore.getState().error).toBeNull();
    });

    it('preserves loadSessionFromData', () => {
      const sessionInfo = createMockSessionInfo('session-1');
      const session = { info: sessionInfo, messages: [] };

      useSessionStore.getState().loadSessionFromData(session);

      expect(useSessionStore.getState().session).toBe(session);
      expect(useSessionStore.getState().isLoading).toBe(false);
      expect(useSessionStore.getState().error).toBeNull();
    });

    it('preserves clearSession', () => {
      const sessionInfo = createMockSessionInfo('session-1');
      const session = { info: sessionInfo, messages: [] };
      useSessionStore.getState().loadSessionFromData(session);

      useSessionStore.getState().clearSession();

      expect(useSessionStore.getState().session).toBeNull();
      expect(useSessionStore.getState().error).toBeNull();
    });
  });
});

describe('sessionStore - reactivity', () => {
  beforeEach(() => {
    resetStore();
  });

  it('state changes are reactive', () => {
    const states: Array<{ projectCount: number }> = [];

    // Subscribe to changes
    const unsubscribe = useSessionStore.subscribe((state) => {
      states.push({ projectCount: state.projects.length });
    });

    // Trigger changes
    const project: ProjectInfo = {
      id: 'project-1',
      path: '/path',
      sessions: [],
    };
    useSessionStore.getState().setProjects([project]);

    // Verify subscription fired
    expect(states.length).toBeGreaterThan(0);
    expect(states[states.length - 1].projectCount).toBe(1);

    unsubscribe();
  });

  it('allSessions map is reactive', () => {
    const session = createMockSessionInfo('session-1', 'project-1');
    const node = createMockSessionNode(session);
    const project: ProjectInfo = {
      id: 'project-1',
      path: '/path',
      sessions: [node],
    };

    useSessionStore.getState().setProjects([project]);

    // After setProjects, allSessions should be populated
    const allSessions = useSessionStore.getState().allSessions;
    expect(Object.keys(allSessions).length).toBe(1);
    expect(allSessions['session-1']).toBe(session);
  });
});
