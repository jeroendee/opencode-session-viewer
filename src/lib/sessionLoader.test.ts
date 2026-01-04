import { describe, it, expect, vi, beforeEach } from 'vitest';
import { loadAllSessions } from './sessionLoader';
import type { VirtualFileSystem } from './fileSystem';
import type { SessionInfo } from '../types/session';

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
