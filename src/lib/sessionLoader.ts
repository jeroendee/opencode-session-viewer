import type { VirtualFileSystem } from './fileSystem';
import type { Session, SessionInfo, Message, MessageInfo, Part, TextPart } from '../types/session';
import type { ProjectInfo, SessionNode } from '../store/sessionStore';

/**
 * Result of loading all sessions from storage.
 */
export interface LoadSessionsResult {
  projects: ProjectInfo[];
  sessions: Record<string, SessionInfo>;
  errorCount: number;
}

/**
 * Project metadata stored in project.json files.
 */
interface ProjectMetadata {
  path?: string;
}

/**
 * Builds a tree of session nodes from a flat list of sessions.
 * Sessions with parentID become children of their parent session.
 */
function buildSessionTree(sessions: SessionInfo[]): SessionNode[] {
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
      nodeMap.get(session.parentID)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children by creation time (oldest first)
  const sortChildrenByCreated = (a: SessionNode, b: SessionNode) =>
    a.session.time.created - b.session.time.created;

  // Sort roots by updated time (most recent first)
  const sortRootsByUpdated = (a: SessionNode, b: SessionNode) =>
    b.session.time.updated - a.session.time.updated;

  for (const node of nodeMap.values()) {
    node.children.sort(sortChildrenByCreated);
  }
  roots.sort(sortRootsByUpdated);

  return roots;
}

/**
 * Parses and validates session JSON content.
 * Returns the SessionInfo if valid, null if invalid.
 */
function parseSessionJson(content: string): SessionInfo | null {
  try {
    const data = JSON.parse(content);

    // Validate required fields
    if (!data.info || typeof data.info !== 'object') {
      return null;
    }

    const info = data.info;
    if (
      typeof info.id !== 'string' ||
      typeof info.projectID !== 'string' ||
      typeof info.directory !== 'string' ||
      typeof info.title !== 'string' ||
      !info.time ||
      typeof info.time.created !== 'number' ||
      typeof info.time.updated !== 'number'
    ) {
      return null;
    }

    return info as SessionInfo;
  } catch {
    return null;
  }
}

/**
 * Loads all sessions from the storage directory.
 *
 * Structure expected:
 * - session/{projectId}/project.json - project metadata with path
 * - session/{projectId}/*.json - session files (except project.json)
 *
 * @param fs - Virtual file system to read from
 * @returns Projects with their session trees and a flat lookup map of all sessions
 */
export async function loadAllSessions(
  fs: VirtualFileSystem
): Promise<LoadSessionsResult> {
  const projects: ProjectInfo[] = [];
  const sessions: Record<string, SessionInfo> = {};
  let errorCount = 0;

  // List all project IDs from session/ directory
  let projectIds: string[];
  try {
    projectIds = await fs.listDirectory(['session']);
  } catch (error) {
    console.warn(`Failed to list session directory: ${error}`);
    return { projects, sessions, errorCount: 1 };
  }

  // Load projects in parallel, catching errors per project
  const projectPromises = projectIds.map(async (projectId): Promise<ProjectInfo | null> => {
    try {
      // Load project metadata
      let projectJsonContent: string | null = null;
      try {
        projectJsonContent = await fs.readFile(['session', projectId, 'project.json']);
      } catch {
        // project.json read failed, use default
      }

      let projectPath = projectId; // Default to project ID if no metadata

      if (projectJsonContent) {
        try {
          const metadata: ProjectMetadata = JSON.parse(projectJsonContent);
          if (metadata.path) {
            projectPath = metadata.path;
          }
        } catch {
          // Use default path if project.json is invalid
          console.warn(`Failed to parse project.json for project ${projectId}`);
        }
      }

      // List session files for this project
      let sessionFiles: string[];
      try {
        sessionFiles = await fs.listDirectory(['session', projectId]);
      } catch (error) {
        console.warn(`Failed to list sessions for project ${projectId}: ${error}`);
        errorCount++;
        return null;
      }

      const jsonFiles = sessionFiles.filter(
        (name) => name.endsWith('.json') && name !== 'project.json'
      );

      // Load all session files in parallel, catching errors per file
      const sessionPromises = jsonFiles.map(async (fileName) => {
        const sessionId = fileName.replace(/\.json$/, '');
        try {
          const content = await fs.readFile(['session', projectId, fileName]);

          if (!content) {
            return { sessionId, info: null, error: 'missing' };
          }

          const info = parseSessionJson(content);
          return { sessionId, info, error: info ? null : 'parse' };
        } catch {
          return { sessionId, info: null, error: 'read' };
        }
      });

      const sessionResults = await Promise.all(sessionPromises);
      const projectSessions: SessionInfo[] = [];

      for (const result of sessionResults) {
        if (result.info) {
          projectSessions.push(result.info);
          sessions[result.info.id] = result.info;
        } else {
          errorCount++;
          if (result.error === 'missing') {
            console.warn(`Missing session file content: ${result.sessionId}`);
          } else if (result.error === 'read') {
            console.warn(`Failed to read session file: ${result.sessionId}`);
          } else {
            console.warn(`Failed to parse session file: ${result.sessionId}`);
          }
        }
      }

      // Build session tree for this project
      const sessionTree = buildSessionTree(projectSessions);

      return {
        id: projectId,
        path: projectPath,
        sessions: sessionTree,
      } satisfies ProjectInfo;
    } catch (error) {
      console.warn(`Failed to load project ${projectId}: ${error}`);
      errorCount++;
      return null;
    }
  });

  const loadedProjects = await Promise.all(projectPromises);
  for (const project of loadedProjects) {
    if (project !== null) {
      projects.push(project);
    }
  }

  return { projects, sessions, errorCount };
}

/**
 * Loads the full content of a session including all messages and their parts.
 *
 * Structure expected:
 * - message/{sessionId}/*.json - message info files
 * - part/{messageId}/*.json - part files for each message
 *
 * @param sessionId - The ID of the session to load
 * @param allSessions - Map of all session info (from loadAllSessions)
 * @param fs - Virtual file system to read from
 * @returns The full session with messages and parts
 * @throws Error if session is not found
 */
export async function loadSessionContent(
  sessionId: string,
  allSessions: Record<string, SessionInfo>,
  fs: VirtualFileSystem
): Promise<Session> {
  // 1. Get session info from allSessions (already loaded)
  const info = allSessions[sessionId];
  if (!info) {
    throw new Error(`Session not found: ${sessionId}`);
  }

  // 2. List and load all messages from message/<sessionId>/
  let messageFiles: string[];
  try {
    messageFiles = await fs.listDirectory(['message', sessionId]);
  } catch (error) {
    console.warn(`Failed to list messages for session ${sessionId}: ${error}`);
    // Return session with empty messages if we can't list the directory
    return { info, messages: [] };
  }

  const messages: Message[] = [];

  for (const msgFile of messageFiles) {
    if (!msgFile.endsWith('.json')) {
      continue;
    }

    const msgId = msgFile.replace('.json', '');
    let msgJson: string | null;
    try {
      msgJson = await fs.readFile(['message', sessionId, msgFile]);
    } catch {
      console.warn(`Failed to read message file: ${msgFile}`);
      continue;
    }
    if (!msgJson) continue;

    let msgInfo: MessageInfo;
    try {
      msgInfo = JSON.parse(msgJson) as MessageInfo;
    } catch {
      console.warn(`Failed to parse message file: ${msgFile}`);
      continue;
    }

    // 3. Load parts for this message from part/<messageId>/
    let partFiles: string[];
    try {
      partFiles = await fs.listDirectory(['part', msgId]);
    } catch {
      console.warn(`Failed to list parts for message ${msgId}`);
      // Message with no parts is still valid
      partFiles = [];
    }

    const parts: Part[] = [];

    for (const partFile of partFiles) {
      if (!partFile.endsWith('.json')) {
        continue;
      }

      let partJson: string | null;
      try {
        partJson = await fs.readFile(['part', msgId, partFile]);
      } catch {
        console.warn(`Failed to read part file: ${partFile}`);
        continue;
      }
      if (!partJson) continue;

      try {
        const part = JSON.parse(partJson) as Part;
        parts.push(part);
      } catch {
        console.warn(`Failed to parse part file: ${partFile}`);
      }
    }

    // Sort parts by filename (e.g., "0.json", "1.json") for deterministic order
    parts.sort((a, b) => {
      // Parts typically have an index in the filename, but we can use ID as fallback
      const aId = (a as { id?: string }).id ?? '';
      const bId = (b as { id?: string }).id ?? '';
      return aId.localeCompare(bId);
    });

    messages.push({ info: msgInfo, parts });
  }

  // 4. Sort messages by creation time
  messages.sort((a, b) => a.info.time.created - b.info.time.created);

  return { info, messages };
}

/**
 * Loads and extracts text content from all user messages in a session.
 *
 * @param sessionId - The ID of the session to load user messages for
 * @param fs - Virtual file system to read from
 * @returns Array of user message text strings (one per message)
 */
export async function loadUserMessagesForSession(
  sessionId: string,
  fs: VirtualFileSystem
): Promise<string[]> {
  const userMessageTexts: string[] = [];

  // 1. List all messages from message/<sessionId>/
  let messageFiles: string[];
  try {
    messageFiles = await fs.listDirectory(['message', sessionId]);
  } catch {
    // No message directory - return empty
    return [];
  }

  // 2. Load each message and check if it's a user message
  for (const msgFile of messageFiles) {
    if (!msgFile.endsWith('.json')) {
      continue;
    }

    const msgId = msgFile.replace('.json', '');
    let msgJson: string | null;
    try {
      msgJson = await fs.readFile(['message', sessionId, msgFile]);
    } catch {
      continue;
    }
    if (!msgJson) continue;

    let msgInfo: MessageInfo;
    try {
      msgInfo = JSON.parse(msgJson) as MessageInfo;
    } catch {
      continue;
    }

    // Only process user messages
    if (msgInfo.role !== 'user') {
      continue;
    }

    // 3. Load parts for this message and extract text
    let partFiles: string[];
    try {
      partFiles = await fs.listDirectory(['part', msgId]);
    } catch {
      partFiles = [];
    }

    const textParts: string[] = [];

    for (const partFile of partFiles) {
      if (!partFile.endsWith('.json')) {
        continue;
      }

      let partJson: string | null;
      try {
        partJson = await fs.readFile(['part', msgId, partFile]);
      } catch {
        continue;
      }
      if (!partJson) continue;

      try {
        const part = JSON.parse(partJson) as Part;
        // Only extract text from text parts
        if (part.type === 'text') {
          const textPart = part as TextPart;
          if (textPart.text) {
            textParts.push(textPart.text);
          }
        }
      } catch {
        continue;
      }
    }

    // Join all text parts for this message
    if (textParts.length > 0) {
      userMessageTexts.push(textParts.join(' '));
    }
  }

  return userMessageTexts;
}
