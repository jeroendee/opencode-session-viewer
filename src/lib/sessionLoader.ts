import type { VirtualFileSystem } from './fileSystem';
import type { Session, SessionInfo, Message, MessageInfo, Part, TextPart } from '../types/session';
import type { ProjectInfo, SessionNode } from '../store/sessionStore';
import { StorageError } from './errors';

/**
 * Logger interface for sessionLoader functions.
 * Allows callers to inject custom logging behavior or suppress logs.
 */
export interface SessionLoaderLogger {
  warn: (message: string) => void;
}

/**
 * Default logger that outputs to console.
 * Can be replaced with a no-op logger for tests or production.
 */
export const defaultLogger: SessionLoaderLogger = {
  warn: (message: string) => console.warn(message),
};

/**
 * Silent logger that suppresses all output.
 * Useful for tests or when logs are not wanted.
 */
export const silentLogger: SessionLoaderLogger = {
  warn: () => {},
};

/**
 * Result of loading all sessions from storage.
 */
export interface LoadSessionsResult {
  projects: ProjectInfo[];
  sessions: Record<string, SessionInfo>;
  errorCount: number;
  /** Number of circular parent references that were detected and broken */
  circularRefCount?: number;
}

/**
 * Project metadata stored in project.json files.
 */
interface ProjectMetadata {
  path?: string;
}

/**
 * Result of building a session tree, including any detected issues.
 */
interface BuildSessionTreeResult {
  roots: SessionNode[];
  /** Number of circular parent references that were detected and broken */
  circularRefCount: number;
}

/**
 * Builds a tree of session nodes from a flat list of sessions.
 * Sessions with parentID become children of their parent session.
 * Detects and breaks circular parent references to prevent infinite loops.
 * 
 * DESIGN NOTE: This function operates on sessions within a single project.
 * Parent-child relationships are assumed to exist within the same project.
 * If a session's parentID references a session outside this set (e.g., in
 * another project or non-existent), it will be treated as a root node.
 */
function buildSessionTree(
  sessions: SessionInfo[],
  logger: SessionLoaderLogger = defaultLogger
): BuildSessionTreeResult {
  const nodeMap = new Map<string, SessionNode>();
  const roots: SessionNode[] = [];
  let circularRefCount = 0;

  // Create nodes for all sessions
  for (const session of sessions) {
    nodeMap.set(session.id, { session, children: [] });
  }

  // Build parent lookup for O(1) access
  const parentOf = new Map<string, string | undefined>();
  for (const session of sessions) {
    parentOf.set(session.id, session.parentID);
  }

  // Track which nodes have cyclic parent references (O(n) total)
  // A node is cyclic if following its parent chain eventually leads back to itself
  const cycleBreakPoints = new Set<string>();
  const visited = new Set<string>();

  // For each node, check if it's part of a cycle by following parent chain
  for (const session of sessions) {
    if (visited.has(session.id)) continue;

    const path: string[] = [];
    const pathSet = new Set<string>();
    let current: string | undefined = session.id;

    // Follow parent chain
    while (current && nodeMap.has(current) && !visited.has(current)) {
      if (pathSet.has(current)) {
        // Found cycle - mark all nodes in the cycle as break points
        // The cycle starts at 'current' and includes everything after it in path
        const cycleStartIdx = path.indexOf(current);
        for (let i = cycleStartIdx; i < path.length; i++) {
          cycleBreakPoints.add(path[i]);
        }
        break;
      }

      path.push(current);
      pathSet.add(current);
      current = parentOf.get(current);
    }

    // Mark all nodes in path as visited
    for (const id of path) {
      visited.add(id);
    }
  }

  // Second pass: build parent-child relationships, breaking at cycle points
  for (const session of sessions) {
    const node = nodeMap.get(session.id)!;

    // Check for self-reference
    if (session.parentID === session.id) {
      logger.warn(`Session ${session.id} has self-referential parentID, treating as root`);
      circularRefCount++;
      roots.push(node);
      continue;
    }

    // Check if this is a cycle break point
    if (cycleBreakPoints.has(session.id)) {
      logger.warn(
        `Circular parent reference detected for session ${session.id}, treating as root`
      );
      circularRefCount++;
      roots.push(node);
      continue;
    }

    // Check if this session has a valid parent
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

  return { roots, circularRefCount };
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
  fs: VirtualFileSystem,
  logger: SessionLoaderLogger = defaultLogger
): Promise<LoadSessionsResult> {
  const projects: ProjectInfo[] = [];
  const sessions: Record<string, SessionInfo> = {};
  let errorCount = 0;

  // List all project IDs from session/ directory
  let projectIds: string[];
  try {
    projectIds = await fs.listDirectory(['session']);
  } catch (error) {
    logger.warn(`Failed to list session directory: ${error}`);
    throw new StorageError(
      'Could not find session directory. This may not be an OpenCode storage folder.',
      'NOT_STORAGE_FOLDER'
    );
  }

  // Check if the session directory is empty
  if (projectIds.length === 0) {
    // Don't throw, just return empty - the caller decides if this is an error
    return { projects, sessions, errorCount: 0 };
  }

  // Result type for individual project loading
  type ProjectLoadResult = { project: ProjectInfo; circularRefCount: number } | null;

  // Load projects in parallel, catching errors per project
  const projectPromises = projectIds.map(async (projectId): Promise<ProjectLoadResult> => {
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
          logger.warn(`Failed to parse project.json for project ${projectId}`);
        }
      }

      // List session files for this project
      let sessionFiles: string[];
      try {
        sessionFiles = await fs.listDirectory(['session', projectId]);
      } catch (error) {
        logger.warn(`Failed to list sessions for project ${projectId}: ${error}`);
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
            logger.warn(`Missing session file content: ${result.sessionId}`);
          } else if (result.error === 'read') {
            logger.warn(`Failed to read session file: ${result.sessionId}`);
          } else {
            logger.warn(`Failed to parse session file: ${result.sessionId}`);
          }
        }
      }

      // Build session tree for this project
      const treeResult = buildSessionTree(projectSessions, logger);

      return {
        project: {
          id: projectId,
          path: projectPath,
          sessions: treeResult.roots,
        } satisfies ProjectInfo,
        circularRefCount: treeResult.circularRefCount,
      };
    } catch (error) {
      logger.warn(`Failed to load project ${projectId}: ${error}`);
      errorCount++;
      return null;
    }
  });

  const loadedProjectResults = await Promise.all(projectPromises);
  let totalCircularRefCount = 0;

  for (const result of loadedProjectResults) {
    if (result !== null) {
      projects.push(result.project);
      totalCircularRefCount += result.circularRefCount;
    }
  }

  return {
    projects,
    sessions,
    errorCount,
    circularRefCount: totalCircularRefCount > 0 ? totalCircularRefCount : undefined,
  };
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
  fs: VirtualFileSystem,
  logger: SessionLoaderLogger = defaultLogger
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
    logger.warn(`Failed to list messages for session ${sessionId}: ${error}`);
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
      logger.warn(`Failed to read message file: ${msgFile}`);
      continue;
    }
    if (!msgJson) continue;

    let msgInfo: MessageInfo;
    try {
      msgInfo = JSON.parse(msgJson) as MessageInfo;
    } catch {
      logger.warn(`Failed to parse message file: ${msgFile}`);
      continue;
    }

    // 3. Load parts for this message from part/<messageId>/
    let partFiles: string[];
    try {
      partFiles = await fs.listDirectory(['part', msgId]);
    } catch {
      logger.warn(`Failed to list parts for message ${msgId}`);
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
        logger.warn(`Failed to read part file: ${partFile}`);
        continue;
      }
      if (!partJson) continue;

      try {
        const part = JSON.parse(partJson) as Part;
        parts.push(part);
      } catch {
        logger.warn(`Failed to parse part file: ${partFile}`);
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
