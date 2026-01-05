import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAllSessions, loadSessionContent, loadUserMessagesForSession } from './sessionLoader';
import { StorageError } from './errors';
import type { VirtualFileSystem } from './fileSystem';
import type { SessionInfo, MessageInfo, Part } from '../types/session';

/**
 * Creates a mock VirtualFileSystem from a simple object structure.
 * Keys are paths like 'session/proj1/session1.json', values are file contents.
 */
function createMockFileSystem(files: Record<string, string>): VirtualFileSystem {
  const directories = new Set<string>();
  directories.add(''); // root

  for (const filePath of Object.keys(files)) {
    const segments = filePath.split('/');
    for (let i = 1; i < segments.length; i++) {
      directories.add(segments.slice(0, i).join('/'));
    }
  }

  return {
    async readFile(path: string[]): Promise<string | null> {
      const pathString = path.join('/');
      return files[pathString] ?? null;
    },

    async listDirectory(path: string[]): Promise<string[]> {
      const pathString = path.join('/');

      // If path is a file, return empty
      if (files[pathString] !== undefined) {
        return [];
      }

      // If path doesn't exist as a directory, return empty
      if (pathString !== '' && !directories.has(pathString)) {
        return [];
      }

      const prefix = pathString === '' ? '' : pathString + '/';
      const entries = new Set<string>();

      for (const filePath of Object.keys(files)) {
        if (pathString === '' || filePath.startsWith(prefix)) {
          const relativePath = pathString === '' ? filePath : filePath.slice(prefix.length);
          const firstSegment = relativePath.split('/')[0];
          if (firstSegment) {
            entries.add(firstSegment);
          }
        }
      }

      return Array.from(entries);
    },

    async exists(path: string[]): Promise<boolean> {
      if (path.length === 0) return true;
      const pathString = path.join('/');
      return files[pathString] !== undefined || directories.has(pathString);
    },
  };
}

/**
 * Creates a valid session JSON string for testing.
 */
function createSessionJson(overrides: Partial<SessionInfo> = {}): string {
  const defaultSession: SessionInfo = {
    id: 'session-1',
    version: '1.0',
    projectID: 'project-1',
    directory: '/path/to/project',
    title: 'Test Session',
    time: {
      created: 1000,
      updated: 2000,
    },
    ...overrides,
  };
  return JSON.stringify({ info: defaultSession, messages: [] });
}

describe('loadAllSessions', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('returns empty results when session directory is empty', async () => {
    const fs = createMockFileSystem({});

    const result = await loadAllSessions(fs);

    expect(result.projects).toEqual([]);
    expect(result.sessions).toEqual({});
    expect(result.errorCount).toBe(0);
  });

  it('loads a single project with one session', async () => {
    const sessionInfo: Partial<SessionInfo> = {
      id: 'sess-1',
      projectID: 'proj-1',
      title: 'My Session',
      directory: '/code',
      time: { created: 1000, updated: 2000 },
    };

    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson(sessionInfo),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].id).toBe('proj-1');
    expect(result.projects[0].path).toBe('proj-1'); // defaults to id
    expect(result.projects[0].sessions).toHaveLength(1);
    expect(result.projects[0].sessions[0].session.id).toBe('sess-1');

    expect(Object.keys(result.sessions)).toEqual(['sess-1']);
    expect(result.sessions['sess-1'].title).toBe('My Session');
    expect(result.errorCount).toBe(0);
  });

  it('loads project path from project.json', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/project.json': JSON.stringify({ path: '/Users/test/myproject' }),
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects[0].path).toBe('/Users/test/myproject');
  });

  it('uses project id as path when project.json is missing', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects[0].path).toBe('proj-1');
  });

  it('handles invalid project.json gracefully', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/project.json': 'not valid json {{{',
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects[0].path).toBe('proj-1');
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      'Failed to parse project.json for project proj-1'
    );
  });

  it('loads multiple sessions in one project', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/sess-2.json': createSessionJson({
        id: 'sess-2',
        projectID: 'proj-1',
        time: { created: 2000, updated: 2500 },
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].sessions).toHaveLength(2);
    expect(Object.keys(result.sessions)).toHaveLength(2);
    expect(result.sessions['sess-1']).toBeDefined();
    expect(result.sessions['sess-2']).toBeDefined();
  });

  it('loads multiple projects', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
      }),
      'session/proj-2/sess-2.json': createSessionJson({
        id: 'sess-2',
        projectID: 'proj-2',
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects).toHaveLength(2);
    expect(result.projects.map((p) => p.id).sort()).toEqual(['proj-1', 'proj-2']);
    expect(Object.keys(result.sessions).sort()).toEqual(['sess-1', 'sess-2']);
  });

  it('skips corrupted session files and continues loading', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/valid.json': createSessionJson({
        id: 'valid-sess',
        projectID: 'proj-1',
      }),
      'session/proj-1/corrupted.json': 'not valid json {{{',
    });

    const result = await loadAllSessions(fs);

    expect(result.projects).toHaveLength(1);
    expect(Object.keys(result.sessions)).toEqual(['valid-sess']);
    expect(result.errorCount).toBe(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to parse session file: corrupted');
  });

  it('skips sessions with missing required fields', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/incomplete.json': JSON.stringify({
        info: {
          id: 'incomplete',
          // Missing projectID, directory, title, time
        },
        messages: [],
      }),
    });

    const result = await loadAllSessions(fs);

    expect(Object.keys(result.sessions)).toEqual([]);
    expect(result.errorCount).toBe(1);
  });

  it('builds session tree with parent-child relationships', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/root.json': createSessionJson({
        id: 'root',
        projectID: 'proj-1',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/child.json': createSessionJson({
        id: 'child',
        projectID: 'proj-1',
        parentID: 'root',
        time: { created: 2000, updated: 2500 },
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects[0].sessions).toHaveLength(1);
    expect(result.projects[0].sessions[0].session.id).toBe('root');
    expect(result.projects[0].sessions[0].children).toHaveLength(1);
    expect(result.projects[0].sessions[0].children[0].session.id).toBe('child');
  });

  it('handles orphaned sessions (parent not found)', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/orphan.json': createSessionJson({
        id: 'orphan',
        projectID: 'proj-1',
        parentID: 'non-existent-parent',
        time: { created: 1000, updated: 1500 },
      }),
    });

    const result = await loadAllSessions(fs);

    // Orphaned sessions become roots
    expect(result.projects[0].sessions).toHaveLength(1);
    expect(result.projects[0].sessions[0].session.id).toBe('orphan');
    expect(result.projects[0].sessions[0].children).toHaveLength(0);
  });

  it('sorts root sessions by updated time (most recent first)', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/new.json': createSessionJson({
        id: 'new',
        projectID: 'proj-1',
        time: { created: 3000, updated: 3500 },
      }),
      'session/proj-1/old.json': createSessionJson({
        id: 'old',
        projectID: 'proj-1',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/middle.json': createSessionJson({
        id: 'middle',
        projectID: 'proj-1',
        time: { created: 2000, updated: 2500 },
      }),
    });

    const result = await loadAllSessions(fs);

    // Roots are sorted by updated time (most recent first)
    expect(result.projects[0].sessions.map((n) => n.session.id)).toEqual([
      'new',
      'middle',
      'old',
    ]);
  });

  it('sorts children by creation time', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/root.json': createSessionJson({
        id: 'root',
        projectID: 'proj-1',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/child-new.json': createSessionJson({
        id: 'child-new',
        projectID: 'proj-1',
        parentID: 'root',
        time: { created: 3000, updated: 3500 },
      }),
      'session/proj-1/child-old.json': createSessionJson({
        id: 'child-old',
        projectID: 'proj-1',
        parentID: 'root',
        time: { created: 2000, updated: 2500 },
      }),
    });

    const result = await loadAllSessions(fs);

    const root = result.projects[0].sessions[0];
    expect(root.children.map((n) => n.session.id)).toEqual(['child-old', 'child-new']);
  });

  it('builds deeply nested session trees', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/level1.json': createSessionJson({
        id: 'level1',
        projectID: 'proj-1',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/level2.json': createSessionJson({
        id: 'level2',
        projectID: 'proj-1',
        parentID: 'level1',
        time: { created: 2000, updated: 2500 },
      }),
      'session/proj-1/level3.json': createSessionJson({
        id: 'level3',
        projectID: 'proj-1',
        parentID: 'level2',
        time: { created: 3000, updated: 3500 },
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.projects[0].sessions).toHaveLength(1);
    expect(result.projects[0].sessions[0].session.id).toBe('level1');
    expect(result.projects[0].sessions[0].children[0].session.id).toBe('level2');
    expect(result.projects[0].sessions[0].children[0].children[0].session.id).toBe('level3');
  });

  it('excludes project.json from session files', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/project.json': JSON.stringify({ path: '/test' }),
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
      }),
    });

    const result = await loadAllSessions(fs);

    // Only session files should be loaded, not project.json
    expect(Object.keys(result.sessions)).toEqual(['sess-1']);
    expect(result.errorCount).toBe(0);
  });

  it('excludes non-json files from session loading', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
      }),
      'session/proj-1/readme.txt': 'not a session file',
      'session/proj-1/notes.md': '# Notes',
    });

    const result = await loadAllSessions(fs);

    expect(Object.keys(result.sessions)).toEqual(['sess-1']);
    expect(result.errorCount).toBe(0);
  });

  it('handles empty project directories', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/project.json': JSON.stringify({ path: '/test' }),
      // No session files
    });

    const result = await loadAllSessions(fs);

    expect(result.projects).toHaveLength(1);
    expect(result.projects[0].sessions).toEqual([]);
    expect(Object.keys(result.sessions)).toEqual([]);
  });

  it('preserves session summary data', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
        summary: {
          additions: 100,
          deletions: 50,
          files: 5,
        },
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.sessions['sess-1'].summary).toEqual({
      additions: 100,
      deletions: 50,
      files: 5,
    });
  });
});

describe('loadAllSessions circular references', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('handles mutual parent references without infinite loop', async () => {
    // A.parentID = B, B.parentID = A - should not cause infinite loop
    const fs = createMockFileSystem({
      'session/proj-1/sess-a.json': createSessionJson({
        id: 'sess-a',
        projectID: 'proj-1',
        parentID: 'sess-b',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/sess-b.json': createSessionJson({
        id: 'sess-b',
        projectID: 'proj-1',
        parentID: 'sess-a',
        time: { created: 2000, updated: 2500 },
      }),
    });

    const result = await loadAllSessions(fs);

    // Both should be present - algorithm processes each session once
    expect(Object.keys(result.sessions)).toHaveLength(2);
    expect(result.errorCount).toBe(0);
    // Both should become roots due to circular reference detection
    expect(result.projects[0].sessions.length).toBe(2);
    // Should have detected circular references
    expect(result.circularRefCount).toBeGreaterThan(0);
  });

  it('handles self-referential parentID', async () => {
    // Session refers to itself as parent
    const fs = createMockFileSystem({
      'session/proj-1/sess-a.json': createSessionJson({
        id: 'sess-a',
        projectID: 'proj-1',
        parentID: 'sess-a', // Self-reference
        time: { created: 1000, updated: 1500 },
      }),
    });

    const result = await loadAllSessions(fs);

    // Should handle gracefully - session can't be its own parent
    expect(Object.keys(result.sessions)).toHaveLength(1);
    // Session becomes a root
    expect(result.projects[0].sessions.length).toBe(1);
    expect(result.circularRefCount).toBe(1);
    // Warning should be logged
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining('self-referential')
    );
  });

  it('handles longer circular chains (A -> B -> C -> A)', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-a.json': createSessionJson({
        id: 'sess-a',
        projectID: 'proj-1',
        parentID: 'sess-c',
        time: { created: 1000, updated: 1500 },
      }),
      'session/proj-1/sess-b.json': createSessionJson({
        id: 'sess-b',
        projectID: 'proj-1',
        parentID: 'sess-a',
        time: { created: 2000, updated: 2500 },
      }),
      'session/proj-1/sess-c.json': createSessionJson({
        id: 'sess-c',
        projectID: 'proj-1',
        parentID: 'sess-b',
        time: { created: 3000, updated: 3500 },
      }),
    });

    const result = await loadAllSessions(fs);

    // All sessions should be present
    expect(Object.keys(result.sessions)).toHaveLength(3);
    expect(result.errorCount).toBe(0);
    // Should not hang, algorithm should complete
    expect(result.projects).toHaveLength(1);
    // Circular references should be detected
    expect(result.circularRefCount).toBeGreaterThan(0);
  });

  it('returns circularRefCount as undefined when no circular refs', async () => {
    const fs = createMockFileSystem({
      'session/proj-1/sess-1.json': createSessionJson({
        id: 'sess-1',
        projectID: 'proj-1',
        time: { created: 1000, updated: 1500 },
      }),
    });

    const result = await loadAllSessions(fs);

    expect(result.circularRefCount).toBeUndefined();
  });
});

describe('loadAllSessions error handling', () => {
  it('throws StorageError when session directory does not exist', async () => {
    // Create a filesystem that throws when listing session directory
    const mockFs: VirtualFileSystem = {
      readFile: async () => null,
      listDirectory: async (path: string[]) => {
        if (path[0] === 'session') {
          throw new Error('Directory not found');
        }
        return [];
      },
      exists: async () => false,
    };

    await expect(loadAllSessions(mockFs)).rejects.toThrow(StorageError);
    await expect(loadAllSessions(mockFs)).rejects.toThrow(/not be an OpenCode storage folder/);
  });

  it('returns empty results when session directory is empty (no projects)', async () => {
    const fs = createMockFileSystem({});

    const result = await loadAllSessions(fs);

    expect(result.projects).toEqual([]);
    expect(result.sessions).toEqual({});
    expect(result.errorCount).toBe(0);
  });
});

describe('loadAllSessions performance', () => {
  it('loads many sessions in parallel', async () => {
    // Create 50 sessions across 5 projects
    const files: Record<string, string> = {};

    for (let proj = 0; proj < 5; proj++) {
      for (let sess = 0; sess < 10; sess++) {
        const id = `sess-${proj}-${sess}`;
        files[`session/proj-${proj}/${id}.json`] = createSessionJson({
          id,
          projectID: `proj-${proj}`,
          time: { created: sess * 1000, updated: sess * 1000 + 500 },
        });
      }
    }

    const fs = createMockFileSystem(files);

    const start = performance.now();
    const result = await loadAllSessions(fs);
    const duration = performance.now() - start;

    expect(result.projects).toHaveLength(5);
    expect(Object.keys(result.sessions)).toHaveLength(50);
    expect(result.errorCount).toBe(0);

    // Should complete quickly due to parallel loading (mock fs is instant)
    expect(duration).toBeLessThan(100);
  });
});

/**
 * Creates a mock message info for testing.
 */
function createMockMessageInfo(
  id: string,
  sessionId: string,
  role: 'user' | 'assistant',
  createdTime: number
): MessageInfo {
  if (role === 'user') {
    return {
      id,
      sessionID: sessionId,
      role: 'user',
      time: { created: createdTime },
      agent: 'test-agent',
      model: { providerID: 'test-provider', modelID: 'test-model' },
    };
  }
  return {
    id,
    sessionID: sessionId,
    role: 'assistant',
    parentID: 'parent-msg',
    time: { created: createdTime },
    modelID: 'test-model',
    providerID: 'test-provider',
    agent: 'test-agent',
    mode: 'normal',
    path: { cwd: '/test', root: '/test' },
    cost: 0,
    tokens: { input: 10, output: 20, reasoning: 0, cache: { read: 0, write: 0 } },
  };
}

/**
 * Creates a mock text part for testing.
 */
function createMockTextPart(id: string, sessionId: string, messageId: string, text: string): Part {
  return {
    id,
    sessionID: sessionId,
    messageID: messageId,
    type: 'text',
    text,
  };
}

describe('loadSessionContent', () => {
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('throws error when session not found in allSessions', async () => {
    const fs = createMockFileSystem({});
    const allSessions: Record<string, SessionInfo> = {};

    await expect(loadSessionContent('nonexistent', allSessions, fs)).rejects.toThrow(
      'Session not found: nonexistent'
    );
  });

  it('loads session with no messages', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({});

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.info).toBe(sessionInfo);
    expect(session.messages).toEqual([]);
  });

  it('loads session with one message and no parts', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1500);
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msgInfo),
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].info).toEqual(msgInfo);
    expect(session.messages[0].parts).toEqual([]);
  });

  it('loads session with message and parts', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msgInfo = createMockMessageInfo('msg-1', 'sess-1', 'assistant', 1500);
    const part1 = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Hello');
    const part2 = createMockTextPart('part-2', 'sess-1', 'msg-1', 'World');
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msgInfo),
      'part/msg-1/part-1.json': JSON.stringify(part1),
      'part/msg-1/part-2.json': JSON.stringify(part2),
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].parts).toHaveLength(2);
    expect(session.messages[0].parts).toContainEqual(part1);
    expect(session.messages[0].parts).toContainEqual(part2);
  });

  it('loads multiple messages and sorts by creation time', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msg1 = createMockMessageInfo('msg-1', 'sess-1', 'user', 3000);
    const msg2 = createMockMessageInfo('msg-2', 'sess-1', 'assistant', 1000);
    const msg3 = createMockMessageInfo('msg-3', 'sess-1', 'user', 2000);
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msg1),
      'message/sess-1/msg-2.json': JSON.stringify(msg2),
      'message/sess-1/msg-3.json': JSON.stringify(msg3),
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages).toHaveLength(3);
    // Sorted by creation time (oldest first)
    expect(session.messages[0].info.id).toBe('msg-2'); // created at 1000
    expect(session.messages[1].info.id).toBe('msg-3'); // created at 2000
    expect(session.messages[2].info.id).toBe('msg-1'); // created at 3000
  });

  it('skips non-json files in message directory', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1500);
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msgInfo),
      'message/sess-1/readme.txt': 'not a message',
      'message/sess-1/notes.md': '# Notes',
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].info.id).toBe('msg-1');
  });

  it('skips non-json files in part directory', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1500);
    const part1 = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Hello');
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msgInfo),
      'part/msg-1/part-1.json': JSON.stringify(part1),
      'part/msg-1/readme.txt': 'not a part',
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages[0].parts).toHaveLength(1);
    expect(session.messages[0].parts[0].id).toBe('part-1');
  });

  it('handles corrupted message files gracefully', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const validMsg = createMockMessageInfo('msg-1', 'sess-1', 'user', 1500);
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(validMsg),
      'message/sess-1/corrupted.json': 'not valid json {{{',
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].info.id).toBe('msg-1');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to parse message file: corrupted.json');
  });

  it('handles corrupted part files gracefully', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1500);
    const validPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Hello');
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msgInfo),
      'part/msg-1/part-1.json': JSON.stringify(validPart),
      'part/msg-1/corrupted.json': 'not valid json {{{',
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages[0].parts).toHaveLength(1);
    expect(session.messages[0].parts[0].id).toBe('part-1');
    expect(consoleWarnSpy).toHaveBeenCalledWith('Failed to parse part file: corrupted.json');
  });

  it('handles missing message file content', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };

    // Create a filesystem that lists the file but returns null content
    const mockFs: VirtualFileSystem = {
      readFile: async () => null, // File exists in listing but content is null
      async listDirectory(path: string[]): Promise<string[]> {
        if (path.join('/') === 'message/sess-1') {
          return ['msg-1.json'];
        }
        return [];
      },
      exists: async () => true,
    };

    const session = await loadSessionContent('sess-1', allSessions, mockFs);

    expect(session.messages).toHaveLength(0);
  });

  it('handles missing part file content', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1500);
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };

    // Create a filesystem that returns null for part content
    const mockFs: VirtualFileSystem = {
      async readFile(path: string[]): Promise<string | null> {
        if (path.join('/') === 'message/sess-1/msg-1.json') {
          return JSON.stringify(msgInfo);
        }
        return null; // Part content is null
      },
      async listDirectory(path: string[]): Promise<string[]> {
        if (path.join('/') === 'message/sess-1') {
          return ['msg-1.json'];
        }
        if (path.join('/') === 'part/msg-1') {
          return ['part-1.json'];
        }
        return [];
      },
      async exists(): Promise<boolean> {
        return true;
      },
    };

    const session = await loadSessionContent('sess-1', allSessions, mockFs);

    expect(session.messages).toHaveLength(1);
    expect(session.messages[0].parts).toHaveLength(0);
  });

  it('loads complex session with multiple messages and parts', async () => {
    const sessionInfo: SessionInfo = {
      id: 'sess-1',
      version: '1.0',
      projectID: 'proj-1',
      directory: '/path',
      title: 'Test Session',
      time: { created: 1000, updated: 2000 },
    };
    const msg1 = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const msg2 = createMockMessageInfo('msg-2', 'sess-1', 'assistant', 2000);
    const part1a = createMockTextPart('part-1a', 'sess-1', 'msg-1', 'Question');
    const part2a = createMockTextPart('part-2a', 'sess-1', 'msg-2', 'Answer');
    const part2b = createMockTextPart('part-2b', 'sess-1', 'msg-2', 'More info');
    const allSessions: Record<string, SessionInfo> = { 'sess-1': sessionInfo };
    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(msg1),
      'message/sess-1/msg-2.json': JSON.stringify(msg2),
      'part/msg-1/part-1a.json': JSON.stringify(part1a),
      'part/msg-2/part-2a.json': JSON.stringify(part2a),
      'part/msg-2/part-2b.json': JSON.stringify(part2b),
    });

    const session = await loadSessionContent('sess-1', allSessions, fs);

    expect(session.messages).toHaveLength(2);

    // First message (user)
    expect(session.messages[0].info.id).toBe('msg-1');
    expect(session.messages[0].parts).toHaveLength(1);
    expect(session.messages[0].parts[0].id).toBe('part-1a');

    // Second message (assistant)
    expect(session.messages[1].info.id).toBe('msg-2');
    expect(session.messages[1].parts).toHaveLength(2);
  });
});

describe('loadUserMessagesForSession', () => {
  it('returns empty array when no messages directory exists', async () => {
    const fs = createMockFileSystem({});

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toEqual([]);
  });

  it('returns empty array when session has no messages', async () => {
    const fs = createMockFileSystem({
      'message/sess-1/placeholder': '', // Directory exists but no .json files
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toEqual([]);
  });

  it('extracts text from single user message with one text part', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const textPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Hello, how are you?');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
      'part/msg-1/part-1.json': JSON.stringify(textPart),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Hello, how are you?');
  });

  it('joins multiple text parts from a single user message', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const textPart1 = createMockTextPart('part-1', 'sess-1', 'msg-1', 'First part');
    const textPart2 = createMockTextPart('part-2', 'sess-1', 'msg-1', 'Second part');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
      'part/msg-1/part-1.json': JSON.stringify(textPart1),
      'part/msg-1/part-2.json': JSON.stringify(textPart2),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('First part Second part');
  });

  it('extracts text from multiple user messages', async () => {
    const userMsg1 = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const userMsg2 = createMockMessageInfo('msg-2', 'sess-1', 'user', 2000);
    const textPart1 = createMockTextPart('part-1', 'sess-1', 'msg-1', 'First message');
    const textPart2 = createMockTextPart('part-2', 'sess-1', 'msg-2', 'Second message');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsg1),
      'message/sess-1/msg-2.json': JSON.stringify(userMsg2),
      'part/msg-1/part-1.json': JSON.stringify(textPart1),
      'part/msg-2/part-2.json': JSON.stringify(textPart2),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(2);
    expect(result).toContain('First message');
    expect(result).toContain('Second message');
  });

  it('ignores assistant messages', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const assistantMsgInfo = createMockMessageInfo('msg-2', 'sess-1', 'assistant', 2000);
    const userTextPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'User message');
    const assistantTextPart = createMockTextPart('part-2', 'sess-1', 'msg-2', 'Assistant response');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
      'message/sess-1/msg-2.json': JSON.stringify(assistantMsgInfo),
      'part/msg-1/part-1.json': JSON.stringify(userTextPart),
      'part/msg-2/part-2.json': JSON.stringify(assistantTextPart),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('User message');
  });

  it('ignores non-text parts', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const textPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Text content');
    const filePart: Part = {
      id: 'part-2',
      sessionID: 'sess-1',
      messageID: 'msg-1',
      type: 'file',
      mime: 'image/png',
      url: 'data:image/png;base64,abc',
    };

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
      'part/msg-1/part-1.json': JSON.stringify(textPart),
      'part/msg-1/part-2.json': JSON.stringify(filePart),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Text content');
  });

  it('handles corrupted message files gracefully', async () => {
    const validUserMsg = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const textPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Valid message');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(validUserMsg),
      'message/sess-1/corrupted.json': 'not valid json {{{',
      'part/msg-1/part-1.json': JSON.stringify(textPart),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Valid message');
  });

  it('handles corrupted part files gracefully', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const validPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Valid text');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
      'part/msg-1/part-1.json': JSON.stringify(validPart),
      'part/msg-1/corrupted.json': 'not valid json {{{',
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Valid text');
  });

  it('skips user messages with no text parts', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    // No parts for this message

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toEqual([]);
  });

  it('skips non-json files', async () => {
    const userMsgInfo = createMockMessageInfo('msg-1', 'sess-1', 'user', 1000);
    const textPart = createMockTextPart('part-1', 'sess-1', 'msg-1', 'Valid text');

    const fs = createMockFileSystem({
      'message/sess-1/msg-1.json': JSON.stringify(userMsgInfo),
      'message/sess-1/readme.txt': 'not a message',
      'part/msg-1/part-1.json': JSON.stringify(textPart),
      'part/msg-1/notes.md': '# Notes',
    });

    const result = await loadUserMessagesForSession('sess-1', fs);

    expect(result).toHaveLength(1);
    expect(result[0]).toBe('Valid text');
  });
});
