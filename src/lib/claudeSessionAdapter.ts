import type { Session, SessionInfo } from '../types/session';
import type { VirtualFileSystem } from './fileSystem';
import type { ProjectInfo, SessionNode } from '../store/sessionStore';
import { parseClaudeJsonl, convertToSession } from './claudeParser';
import { listClaudeProjects } from './claudeFileSystem';
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

/**
 * Result of extracting session info from Claude JSONL.
 * Includes SessionInfo fields plus optional sessionId from first entry for parent linking.
 */
export interface ExtractSessionInfoResult extends SessionInfo {
  sessionId?: string;
}

const MAX_TITLE_LENGTH = 100;

/**
 * Extracts SessionInfo from Claude JSONL transcript content.
 * Also extracts sessionId from first entry for parent linking.
 */
export function extractSessionInfoFromClaude(
  jsonlContent: string,
  sessionId: string,
  projectPath: string
): ExtractSessionInfoResult {
  const entries = parseClaudeJsonl(jsonlContent);
  const now = Date.now();

  // Extract sessionId from first entry (for parent linking)
  const parentSessionId = entries.length > 0 ? entries[0].sessionId : undefined;

  // Extract title from first user message
  let title = sessionId;
  for (const entry of entries) {
    if (entry.type === 'user') {
      const content = entry.message.content;
      // Handle string content directly
      if (typeof content === 'string') {
        title = content;
        if (title.length > MAX_TITLE_LENGTH) {
          title = title.slice(0, MAX_TITLE_LENGTH - 3) + '...';
        }
        break;
      }
      // Handle array content - find text block
      const textBlock = content.find((b) => b.type === 'text');
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
    sessionId: parentSessionId,
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
 * Builds a tree of session nodes from a flat list of sessions.
 * Sessions with parentID become children of their parent session.
 *
 * Based on sessionLoader.ts buildSessionTree but simplified for Claude sessions.
 */
function buildClaudeSessionTree(sessions: SessionInfo[]): SessionNode[] {
  const nodeMap = new Map<string, SessionNode>();
  const roots: SessionNode[] = [];

  // Create nodes for all sessions
  for (const session of sessions) {
    nodeMap.set(session.id, { session, children: [] });
  }

  // Build parent-child relationships
  for (const session of sessions) {
    const node = nodeMap.get(session.id)!;

    if (session.parentID && nodeMap.has(session.parentID)) {
      // Has valid parent - add as child
      nodeMap.get(session.parentID)!.children.push(node);
    } else {
      // No parent or parent not found - treat as root
      roots.push(node);
    }
  }

  // Sort children by creation time (oldest first)
  for (const node of nodeMap.values()) {
    node.children.sort((a, b) => a.session.time.created - b.session.time.created);
  }

  // Sort roots by updated time (most recent first)
  roots.sort((a, b) => b.session.time.updated - a.session.time.updated);

  return roots;
}

/**
 * Loads all Claude sessions from the projects/ directory.
 * Returns LoadSessionsResult shape matching OpenCode's loadAllSessions.
 *
 * Uses two-pass approach:
 * 1. First pass loads all sessions with sessionId from JSONL
 * 2. Second pass sets parentID where sessionId maps to existing session ID
 * 3. Builds tree structure using buildClaudeSessionTree
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
    // Temporary storage for sessions with their sessionId (for parent linking)
    const projectSessionInfos: ExtractSessionInfoResult[] = [];

    // List JSONL files in this project
    let files: string[];
    try {
      files = await fs.listDirectory(['projects', project.encoded]);
    } catch {
      errorCount++;
      continue;
    }

    const jsonlFiles = files.filter((f) => f.endsWith('.jsonl'));

    // PASS 1: Load all sessions with sessionId
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

        projectSessionInfos.push(info);
      } catch {
        errorCount++;
      }
    }

    // Build set of valid session IDs in this project
    const validSessionIds = new Set(projectSessionInfos.map((s) => s.id));

    // PASS 2: Set parentID where sessionId maps to existing session
    const finalSessions: SessionInfo[] = [];
    for (const info of projectSessionInfos) {
      // Convert ExtractSessionInfoResult to SessionInfo
      // Set parentID if sessionId points to valid session
      const sessionInfo: SessionInfo = {
        id: info.id,
        version: info.version,
        projectID: info.projectID,
        directory: info.directory,
        title: info.title,
        time: info.time,
      };

      // If this session has a sessionId that matches an existing session, set parentID
      if (info.sessionId && validSessionIds.has(info.sessionId)) {
        sessionInfo.parentID = info.sessionId;
      }

      finalSessions.push(sessionInfo);
      sessions[sessionInfo.id] = sessionInfo;
    }

    // Build tree structure
    const sessionTree = buildClaudeSessionTree(finalSessions);

    // Add project to result
    projects.push({
      id: project.encoded,
      path: project.decoded,
      sessions: sessionTree,
    });
  }

  return { projects, sessions, errorCount };
}

/**
 * Loads full session content for a Claude session.
 * Reads JSONL from projects/{projectID}/{sessionId}.jsonl and converts to Session.
 *
 * @param sessionInfo - SessionInfo for the Claude session to load
 * @param fs - Virtual file system to read from
 * @returns Session with info and converted messages
 * @throws Error if session file not found or JSONL is invalid
 */
export async function loadClaudeSessionContent(
  sessionInfo: SessionInfo,
  fs: VirtualFileSystem
): Promise<Session> {
  const path = ['projects', sessionInfo.projectID, `${sessionInfo.id}.jsonl`];
  const content = await fs.readFile(path);

  if (!content) {
    throw new Error(`Session file not found: ${path.join('/')}`);
  }

  const entries = parseClaudeJsonl(content);
  const converted = convertToSession(entries, sessionInfo.id);

  // Use the passed sessionInfo instead of the generated one
  return {
    info: sessionInfo,
    messages: converted.messages,
  };
}
