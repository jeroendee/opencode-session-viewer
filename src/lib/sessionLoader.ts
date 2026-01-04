import type { VirtualFileSystem } from './fileSystem';
import type { SessionInfo } from '../types/session';
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
