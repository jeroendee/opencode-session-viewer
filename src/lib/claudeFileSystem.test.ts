import { describe, it, expect, vi } from 'vitest';
import {
  decodeClaudePath,
  listClaudeProjects,
  listClaudeSessions,
  createClaudeFileSystem,
} from './claudeFileSystem';
import type { VirtualFileSystem } from './fileSystem';

describe('claudeFileSystem', () => {
  describe('decodeClaudePath', () => {
    it('converts hyphens to forward slashes', () => {
      const encoded = '-Users-jeroendee-projects-myapp';

      const result = decodeClaudePath(encoded);

      expect(result).toBe('/Users/jeroendee/projects/myapp');
    });

    it('handles hidden folders (double hyphen)', () => {
      const encoded = '-Users-jeroendee--claude';

      const result = decodeClaudePath(encoded);

      // Double hyphen indicates hidden folder (.something)
      expect(result).toBe('/Users/jeroendee/.claude');
    });
  });

  describe('listClaudeProjects', () => {
    it('returns project paths from projects directory', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn().mockResolvedValue([
          '-Users-jeroendee-project1',
          '-Users-jeroendee-project2',
        ]),
        exists: vi.fn(),
      };

      const projects = await listClaudeProjects(mockFs);

      expect(projects).toEqual([
        { encoded: '-Users-jeroendee-project1', decoded: '/Users/jeroendee/project1' },
        { encoded: '-Users-jeroendee-project2', decoded: '/Users/jeroendee/project2' },
      ]);
    });
  });

  describe('listClaudeSessions', () => {
    it('returns JSONL filenames for a project', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn().mockResolvedValue([
          'session1.jsonl',
          'session2.jsonl',
          'other.txt',
        ]),
        exists: vi.fn(),
      };

      const sessions = await listClaudeSessions(mockFs, '-Users-jeroendee-project1');

      expect(sessions).toEqual(['session1.jsonl', 'session2.jsonl']);
    });
  });

  describe('createClaudeFileSystem', () => {
    it('readFile reads JSONL content', async () => {
      const mockBaseFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue('{"type":"user"}'),
        listDirectory: vi.fn(),
        exists: vi.fn(),
      };

      const claudeFs = createClaudeFileSystem(mockBaseFs);
      const content = await claudeFs.readFile(['projects', '-Users-project', 'session.jsonl']);

      expect(content).toBe('{"type":"user"}');
    });

    it('listDirectory lists projects at root', async () => {
      const mockBaseFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn().mockResolvedValue(['-Users-project1', '-Users-project2']),
        exists: vi.fn(),
      };

      const claudeFs = createClaudeFileSystem(mockBaseFs);
      const entries = await claudeFs.listDirectory(['projects']);

      expect(entries).toEqual(['-Users-project1', '-Users-project2']);
    });

    it('exists checks if project exists', async () => {
      const mockBaseFs: VirtualFileSystem = {
        readFile: vi.fn(),
        listDirectory: vi.fn(),
        exists: vi.fn().mockResolvedValue(true),
      };

      const claudeFs = createClaudeFileSystem(mockBaseFs);
      const result = await claudeFs.exists(['projects', '-Users-project1']);

      expect(result).toBe(true);
    });
  });
});
