/**
 * Integration tests for Claude Code transcript support.
 * Verifies that parser, file system, and session adapter work together.
 */
import { describe, it, expect, vi } from 'vitest';
import { parseClaudeJsonl, convertToSession } from '../lib/claudeParser';
import {
  decodeClaudePath,
  listClaudeProjects,
  listClaudeSessions,
} from '../lib/claudeFileSystem';
import { extractSessionInfoFromClaude, listClaudeSessionInfos } from '../lib/claudeSessionAdapter';
import type { VirtualFileSystem } from '../lib/fileSystem';

describe('Claude Code Integration', () => {
  describe('end-to-end Claude transcript processing', () => {
    const sampleTranscript = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Help me create a function"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"I'll help you create a function."},{"type":"tool_use","id":"toolu_123","name":"Write","input":{"path":"test.ts","content":"function hello() {}"}}]},"usage":{"input_tokens":100,"output_tokens":50}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_123","content":"File written successfully"}]}}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"Done! I created the function."}]},"usage":{"input_tokens":150,"output_tokens":30}}`;

    it('parses JSONL, converts to session, and extracts metadata', () => {
      // Parse JSONL
      const entries = parseClaudeJsonl(sampleTranscript);
      expect(entries).toHaveLength(4);

      // Convert to session
      const session = convertToSession(entries, 'test-session');
      expect(session.messages).toHaveLength(4);
      expect(session.info.version).toBe('claude-code-1.0');

      // Verify message roles
      expect(session.messages[0].info.role).toBe('user');
      expect(session.messages[1].info.role).toBe('assistant');
      expect(session.messages[2].info.role).toBe('user');
      expect(session.messages[3].info.role).toBe('assistant');

      // Verify tool linking
      const toolPart = session.messages[1].parts.find((p) => p.type === 'tool');
      expect(toolPart).toBeDefined();
      if (toolPart && toolPart.type === 'tool') {
        expect((toolPart.state as { output: string }).output).toBe('File written successfully');
      }

      // Extract session info
      const info = extractSessionInfoFromClaude(sampleTranscript, 'test-session', '/Users/test');
      expect(info.title).toBe('Help me create a function');
      expect(info.directory).toBe('/Users/test');
    });

    it('handles token/usage data correctly', () => {
      const entries = parseClaudeJsonl(sampleTranscript);
      const session = convertToSession(entries, 'test-session');

      // Check assistant message tokens
      const assistantMsg = session.messages[1];
      if (assistantMsg.info.role === 'assistant') {
        expect(assistantMsg.info.tokens.input).toBe(100);
        expect(assistantMsg.info.tokens.output).toBe(50);
      }
    });

    it('handles tool errors correctly', () => {
      const errorTranscript = `{"type":"assistant","message":{"role":"assistant","content":[{"type":"tool_use","id":"toolu_err","name":"Execute","input":{"cmd":"bad"}}]}}
{"type":"user","message":{"role":"user","content":[{"type":"tool_result","tool_use_id":"toolu_err","content":"Command failed: permission denied","is_error":true}]}}`;

      const entries = parseClaudeJsonl(errorTranscript);
      const session = convertToSession(entries, 'error-session');

      const toolPart = session.messages[0].parts.find((p) => p.type === 'tool');
      expect(toolPart).toBeDefined();
      if (toolPart && toolPart.type === 'tool') {
        expect((toolPart.state as { status: string }).status).toBe('error');
        expect((toolPart.state as { error: string }).error).toBe(
          'Command failed: permission denied'
        );
      }
    });
  });

  describe('Claude file system and path decoding', () => {
    it('decodes encoded project paths correctly', () => {
      // Note: decoding is best-effort since both '/' and '-' encode to '-'
      // We can only guarantee correct decoding for paths without hyphens in names
      const testCases = [
        { encoded: '-Users-test-project', decoded: '/Users/test/project' },
        { encoded: '-Users-test--claude', decoded: '/Users/test/.claude' },
        // Paths with hyphens in original names can't be perfectly reversed
        // but the result is still human-readable
        { encoded: '-Users-test--config', decoded: '/Users/test/.config' },
      ];

      for (const { encoded, decoded } of testCases) {
        expect(decodeClaudePath(encoded)).toBe(decoded);
      }
    });

    it('lists projects and sessions from virtual file system', async () => {
      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockResolvedValue('{}'),
        listDirectory: vi.fn().mockImplementation((path: string[]) => {
          if (path.length === 1 && path[0] === 'projects') {
            return Promise.resolve(['-Users-test-project1', '-Users-test-project2']);
          }
          if (path.length === 2 && path[0] === 'projects') {
            return Promise.resolve(['session1.jsonl', 'session2.jsonl', 'other.txt']);
          }
          return Promise.resolve([]);
        }),
        exists: vi.fn().mockResolvedValue(true),
      };

      // List projects
      const projects = await listClaudeProjects(mockFs);
      expect(projects).toHaveLength(2);
      expect(projects[0].decoded).toBe('/Users/test/project1');

      // List sessions
      const sessions = await listClaudeSessions(mockFs, '-Users-test-project1');
      expect(sessions).toHaveLength(2);
      expect(sessions).toContain('session1.jsonl');
    });
  });

  describe('session adapter integration', () => {
    it('produces valid SessionInfo array from mock file system', async () => {
      const transcript1 = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"First query"}]}}`;
      const transcript2 = `{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Second query"}]}}`;

      const mockFs: VirtualFileSystem = {
        readFile: vi.fn().mockImplementation((path: string[]) => {
          if (path[2] === 'session1.jsonl') return Promise.resolve(transcript1);
          if (path[2] === 'session2.jsonl') return Promise.resolve(transcript2);
          return Promise.resolve(null);
        }),
        listDirectory: vi.fn().mockResolvedValue(['session1.jsonl', 'session2.jsonl']),
        exists: vi.fn().mockResolvedValue(true),
      };

      const infos = await listClaudeSessionInfos(mockFs, '-Users-test-project', '/Users/test/project');

      expect(infos).toHaveLength(2);
      expect(infos[0].title).toBe('First query');
      expect(infos[1].title).toBe('Second query');
      expect(infos[0].version).toBe('claude-code');
      expect(infos[0].directory).toBe('/Users/test/project');
    });
  });

  describe('backward compatibility with OpenCode format', () => {
    it('Claude types and OpenCode types are independent', () => {
      // This test verifies that Claude-specific code doesn't break existing OpenCode handling
      // by ensuring the type systems remain separate

      // Claude session info
      const claudeInfo = extractSessionInfoFromClaude(
        '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Test"}]}}',
        'claude-session',
        '/Users/test'
      );
      expect(claudeInfo.version).toBe('claude-code');

      // OpenCode sessions would have a different version format
      // This test just ensures Claude's version is distinct
      expect(claudeInfo.version).not.toBe('opencode');
    });
  });
});
