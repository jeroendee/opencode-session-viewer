import { describe, it, expect, vi } from 'vitest';
import {
  extractSessionInfoFromClaude,
  listClaudeSessionInfos,
  loadAllClaudeSessions,
  loadClaudeSessionContent,
} from './claudeSessionAdapter';
import type { VirtualFileSystem } from './fileSystem';
import type { SessionInfo } from '../types/session';
import { StorageError } from './errors';

describe('claudeSessionAdapter', () => {
  describe('extractSessionInfoFromClaude', () => {
    it('creates SessionInfo from JSONL content', () => {
      const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello world"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}`;

      const info = extractSessionInfoFromClaude(
        jsonl,
        'session-123',
        '/Users/test/project'
      );

      expect(info.id).toBe('session-123');
      expect(info.version).toBe('claude-code');
      expect(info.directory).toBe('/Users/test/project');
    });

    it('extracts title from first user message', () => {
      const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Help me write a function"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Sure!"}]}}`;

      const info = extractSessionInfoFromClaude(
        jsonl,
        'session-456',
        '/Users/test/project'
      );

      expect(info.title).toBe('Help me write a function');
    });

    it('truncates long titles', () => {
      const longText = 'A'.repeat(200);
      const jsonl = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"${longText}"}]}}`;

      const info = extractSessionInfoFromClaude(
        jsonl,
        'session-789',
        '/Users/test/project'
      );

      expect(info.title.length).toBeLessThanOrEqual(100);
      expect(info.title.endsWith('...')).toBe(true);
    });

    it('uses session ID as title when no user message', () => {
      const jsonl = `{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}`;

      const info = extractSessionInfoFromClaude(
        jsonl,
        'session-abc',
        '/Users/test/project'
      );

      expect(info.title).toBe('session-abc');
    });
  });

  describe('listClaudeSessionInfos', () => {
    it('returns SessionInfo array from project', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn()
          .mockResolvedValueOnce(`{"type":"user","message":{"role":"user","content":[{"type":"text","text":"First session"}]}}`)
          .mockResolvedValueOnce(`{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Second session"}]}}`),
        listDirectory: vi.fn().mockResolvedValue(['session1.jsonl', 'session2.jsonl']),
        exists: vi.fn().mockResolvedValue(true),
      };

      const infos = await listClaudeSessionInfos(
        mockFs,
        '-Users-test-project',
        '/Users/test/project'
      );

      expect(infos).toHaveLength(2);
      expect(infos[0].title).toBe('First session');
      expect(infos[1].title).toBe('Second session');
    });
  });

  describe('loadAllClaudeSessions', () => {
    it('returns LoadSessionsResult shape with empty data when projects/ is empty', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(true),
      };

      const result = await loadAllClaudeSessions(mockFs);

      expect(result).toEqual({
        projects: [],
        sessions: {},
        errorCount: 0,
      });
    });

    it('returns sessions grouped by project with SessionNode array', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(
          `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}`
        ),
        listDirectory: vi.fn().mockImplementation(async (path: string[]) => {
          if (path.length === 1 && path[0] === 'projects') {
            return ['-Users-test-project'];
          }
          if (path.length === 2 && path[1] === '-Users-test-project') {
            return ['session1.jsonl'];
          }
          return [];
        }),
        exists: vi.fn().mockResolvedValue(true),
      };

      const result = await loadAllClaudeSessions(mockFs);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].id).toBe('-Users-test-project');
      expect(result.projects[0].path).toBe('/Users/test/project');
      expect(result.projects[0].sessions).toHaveLength(1);
      expect(result.projects[0].sessions[0].session.id).toBe('session1');
    });

    it('sets projectID to encoded path for each session', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(
          `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}`
        ),
        listDirectory: vi.fn().mockImplementation(async (path: string[]) => {
          if (path.length === 1 && path[0] === 'projects') {
            return ['-Users-test-project'];
          }
          if (path.length === 2 && path[1] === '-Users-test-project') {
            return ['session1.jsonl'];
          }
          return [];
        }),
        exists: vi.fn().mockResolvedValue(true),
      };

      const result = await loadAllClaudeSessions(mockFs);

      expect(result.projects[0].sessions[0].session.projectID).toBe('-Users-test-project');
    });

    it('returns flat sessions record keyed by session ID', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(
          `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}`
        ),
        listDirectory: vi.fn().mockImplementation(async (path: string[]) => {
          if (path.length === 1 && path[0] === 'projects') {
            return ['-Users-test-project'];
          }
          if (path.length === 2 && path[1] === '-Users-test-project') {
            return ['session1.jsonl', 'session2.jsonl'];
          }
          return [];
        }),
        exists: vi.fn().mockResolvedValue(true),
      };

      const result = await loadAllClaudeSessions(mockFs);

      expect(Object.keys(result.sessions)).toHaveLength(2);
      expect(result.sessions['session1']).toBeDefined();
      expect(result.sessions['session2']).toBeDefined();
      expect(result.sessions['session1'].id).toBe('session1');
    });

    it('returns errorCount when session files fail to parse', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockImplementation(async (_path: string[]) => {
          return 'invalid json';
        }),
        listDirectory: vi.fn().mockImplementation(async (path: string[]) => {
          if (path.length === 1 && path[0] === 'projects') {
            return ['-Users-test-project'];
          }
          if (path.length === 2 && path[1] === '-Users-test-project') {
            return ['session1.jsonl'];
          }
          return [];
        }),
        exists: vi.fn().mockResolvedValue(true),
      };

      const result = await loadAllClaudeSessions(mockFs);

      expect(result.errorCount).toBe(1);
      expect(result.projects[0].sessions).toHaveLength(0);
    });

    it('throws StorageError with NOT_STORAGE_FOLDER when projects/ dir does not exist', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn().mockRejectedValue(new Error('Directory not found')),
        exists: vi.fn().mockResolvedValue(false),
      };

      await expect(loadAllClaudeSessions(mockFs)).rejects.toThrow(StorageError);
      await expect(loadAllClaudeSessions(mockFs)).rejects.toMatchObject({
        code: 'NOT_STORAGE_FOLDER',
      });
    });

    it('handles projects with no JSONL files', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn().mockImplementation(async (path: string[]) => {
          if (path.length === 1 && path[0] === 'projects') {
            return ['-Users-test-project'];
          }
          if (path.length === 2 && path[1] === '-Users-test-project') {
            return ['readme.txt', 'config.json']; // No .jsonl files
          }
          return [];
        }),
        exists: vi.fn().mockResolvedValue(true),
      };

      const result = await loadAllClaudeSessions(mockFs);

      expect(result.projects).toHaveLength(1);
      expect(result.projects[0].sessions).toHaveLength(0);
      expect(result.errorCount).toBe(0);
    });
  });

  describe('loadClaudeSessionContent', () => {
    it('reads JSONL from projects/{projectID}/{sessionId}.jsonl path', async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}`;

      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(jsonlContent),
        listDirectory: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(true),
      };

      const sessionInfo: SessionInfo = {
        id: 'session-123',
        version: 'claude-code',
        projectID: '-Users-test-project',
        directory: '/Users/test/project',
        title: 'Test session',
        time: { created: Date.now(), updated: Date.now() },
      };

      await loadClaudeSessionContent(sessionInfo, mockFs);

      expect(mockFs.readFile).toHaveBeenCalledWith([
        'projects',
        '-Users-test-project',
        'session-123.jsonl',
      ]);
    });

    it('returns Session with info and converted messages', async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Hi!"}]}}`;

      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(jsonlContent),
        listDirectory: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(true),
      };

      const sessionInfo: SessionInfo = {
        id: 'session-123',
        version: 'claude-code',
        projectID: '-Users-test-project',
        directory: '/Users/test/project',
        title: 'Test session',
        time: { created: Date.now(), updated: Date.now() },
      };

      const session = await loadClaudeSessionContent(sessionInfo, mockFs);

      expect(session.info).toBe(sessionInfo);
      expect(session.messages).toHaveLength(2);
      expect(session.messages[0].info.role).toBe('user');
      expect(session.messages[1].info.role).toBe('assistant');
    });

    it('throws error when session file is not found', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(null),
        listDirectory: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(false),
      };

      const sessionInfo: SessionInfo = {
        id: 'missing-session',
        version: 'claude-code',
        projectID: '-Users-test-project',
        directory: '/Users/test/project',
        title: 'Missing session',
        time: { created: Date.now(), updated: Date.now() },
      };

      await expect(loadClaudeSessionContent(sessionInfo, mockFs)).rejects.toThrow(
        /Session file not found/
      );
    });

    it('throws error when JSONL content is invalid', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue('invalid json content'),
        listDirectory: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(true),
      };

      const sessionInfo: SessionInfo = {
        id: 'bad-session',
        version: 'claude-code',
        projectID: '-Users-test-project',
        directory: '/Users/test/project',
        title: 'Bad session',
        time: { created: Date.now(), updated: Date.now() },
      };

      await expect(loadClaudeSessionContent(sessionInfo, mockFs)).rejects.toThrow();
    });

    it('preserves sessionInfo in returned Session', async () => {
      const jsonlContent = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Hello"}]}}`;

      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue(jsonlContent),
        listDirectory: vi.fn().mockResolvedValue([]),
        exists: vi.fn().mockResolvedValue(true),
      };

      const sessionInfo: SessionInfo = {
        id: 'session-456',
        version: 'claude-code-1.0',
        projectID: '-Users-test-project',
        directory: '/Users/test/project',
        title: 'Custom title',
        time: { created: 1000, updated: 2000 },
      };

      const session = await loadClaudeSessionContent(sessionInfo, mockFs);

      // Session.info should be the exact sessionInfo passed in
      expect(session.info.id).toBe('session-456');
      expect(session.info.version).toBe('claude-code-1.0');
      expect(session.info.title).toBe('Custom title');
      expect(session.info.time.created).toBe(1000);
      expect(session.info.time.updated).toBe(2000);
    });
  });
});
