import type { SessionInfo } from '../types/session';
import type { VirtualFileSystem } from './fileSystem';
import type { ProjectInfo, SessionNode } from '../store/sessionStore';
import { parseClaudeJsonl } from './claudeParser';
import { listClaudeProjects, decodeClaudePath } from './claudeFileSystem';
import { StorageError } from './errors';

/**
 * Result of loading all Claude sessions from storage.
 * Matches the shape of OpenCode's LoadSessionsResult.
 */
export interface LoadClaudeSessionsResult {
  projects: ProjectInfo[];
  sessions: Record<string, SessionInfo>;
  errorCount: number;
}

const MAX_TITLE_LENGTH = 100;

/**
 * Extracts SessionInfo from Claude JSONL transcript content.
 */
export function extractSessionInfoFromClaude(
  jsonlContent: string,
  sessionId: string,
  projectPath: string
): SessionInfo {
  const entries = parseClaudeJsonl(jsonlContent);
  const now = Date.now();

  // Extract title from first user message
  let title = sessionId;
  for (const entry of entries) {
    if (entry.type === 'user') {
      const textBlock = entry.message.content.find((b) => b.type === 'text');
      if (textBlock && textBlock.type === 'text') {
        title = textBlock.text;
        if (title.length > MAX_TITLE_LENGTH) {
          title = title.slice(0, MAX_TITLE_LENGTH - 3) + '...';
        }
        break;
      }
    }
  }

  return {
    id: sessionId,
    version: 'claude-code',
    projectID: 'claude',
    directory: projectPath,
    title,
    time: { created: now, updated: now },
  };
}

/**
 * Lists all Claude sessions from a project directory as SessionInfo array.
 */
export async function listClaudeSessionInfos(
  fs: VirtualFileSystem,
  projectEncoded: string,
  projectDecoded: string
): Promise<SessionInfo[]> {
  const files = await fs.listDirectory(['projects', projectEncoded]);
  const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

  const infos: SessionInfo[] = [];

  for (const file of jsonlFiles) {
    const content = await fs.readFile(['projects', projectEncoded, file]);
    if (content) {
      const sessionId = file.replace('.jsonl', '');
      const info = extractSessionInfoFromClaude(content, sessionId, projectDecoded);
      infos.push(info);
    }
  }

  return infos;
}

/**
 * Loads all Claude sessions from the projects/ directory.
 * Returns LoadSessionsResult shape matching OpenCode's loadAllSessions.
 *
 * @throws StorageError with NOT_STORAGE_FOLDER when projects/ not found
 */
export async function loadAllClaudeSessions(
  fs: VirtualFileSystem
): Promise<LoadClaudeSessionsResult> {
  const projects: ProjectInfo[] = [];
  const sessions: Record<string, SessionInfo> = {};
  let errorCount = 0;

  // List all project dirs from projects/
  let claudeProjects;
  try {
    claudeProjects = await listClaudeProjects(fs);
  } catch {
    throw new StorageError(
      'Could not find projects directory. This may not be a Claude storage folder.',
      'NOT_STORAGE_FOLDER'
    );
  }

  // Return empty result if no projects
  if (claudeProjects.length === 0) {
    return { projects, sessions, errorCount: 0 };
  }

  // Process each project
  for (const project of claudeProjects) {
    const projectSessions: SessionNode[] = [];

    // List JSONL files in this project
    let files: string[];
    try {
      files = await fs.listDirectory(['projects', project.encoded]);
    } catch {
      errorCount++;
      continue;
    }

    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    // Process each session file
    for (const file of jsonlFiles) {
      try {
        const content = await fs.readFile(['projects', project.encoded, file]);
        if (!content) {
          errorCount++;
          continue;
        }

        const sessionId = file.replace('.jsonl', '');
        const info = extractSessionInfoFromClaude(content, sessionId, project.decoded);

        // Set projectID to encoded path per spec
        info.projectID = project.encoded;

        // Add to flat sessions record
        sessions[sessionId] = info;

        // Add to project's SessionNode array (no children for Claude sessions)
        projectSessions.push({
          session: info,
          children: [],
        });
      } catch {
        errorCount++;
      }
    }

    // Add project to result
    projects.push({
      id: project.encoded,
      path: project.decoded,
      sessions: projectSessions,
    });
  }

  return { projects, sessions, errorCount };
}
