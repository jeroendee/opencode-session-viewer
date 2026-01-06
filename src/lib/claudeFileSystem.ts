import type { VirtualFileSystem } from './fileSystem';

/**
 * Represents a Claude project with its encoded and decoded paths.
 */
export interface ClaudeProject {
  encoded: string;
  decoded: string;
}

/**
 * Decodes a Claude encoded path back to a readable file path.
 * Claude encodes paths by replacing '/' with '-' and '.' with '-'.
 * Double hyphens '--' indicate a hidden folder (original '/.').
 */
export function decodeClaudePath(encoded: string): string {
  // Handle double hyphens first (hidden folders like /.claude -> --claude)
  let decoded = encoded.replace(/--/g, '/.');

  // Replace remaining hyphens with slashes
  decoded = decoded.replace(/-/g, '/');

  return decoded;
}

/**
 * Lists all Claude projects from the projects directory.
 */
export async function listClaudeProjects(fs: VirtualFileSystem): Promise<ClaudeProject[]> {
  const entries = await fs.listDirectory(['projects']);

  return entries.map((encoded) => ({
    encoded,
    decoded: decodeClaudePath(encoded),
  }));
}

/**
 * Lists all JSONL session files for a given project.
 */
export async function listClaudeSessions(
  fs: VirtualFileSystem,
  projectEncoded: string
): Promise<string[]> {
  const entries = await fs.listDirectory(['projects', projectEncoded]);

  return entries.filter((name) => name.endsWith('.jsonl'));
}

/**
 * Creates a VirtualFileSystem adapter for Claude's ~/.claude directory structure.
 * This wraps a base VirtualFileSystem and provides access to Claude's project files.
 */
export function createClaudeFileSystem(baseFs: VirtualFileSystem): VirtualFileSystem {
  return {
    async readFile(path: string[]): Promise<string | null> {
      return baseFs.readFile(path);
    },

    async listDirectory(path: string[]): Promise<string[]> {
      return baseFs.listDirectory(path);
    },

    async exists(path: string[]): Promise<boolean> {
      return baseFs.exists(path);
    },
  };
}
