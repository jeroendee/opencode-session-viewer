import type { SessionNode } from '../store/sessionStore';

/**
 * Finds a SessionNode by session ID within a session tree.
 * Searches recursively through all nodes and their children.
 *
 * @param nodes - Array of root session nodes to search
 * @param sessionId - The session ID to find
 * @returns The SessionNode if found, undefined otherwise
 */
export function findSessionNode(nodes: SessionNode[], sessionId: string): SessionNode | undefined {
  for (const node of nodes) {
    if (node.session.id === sessionId) {
      return node;
    }

    // Search recursively in children
    const found = findSessionNode(node.children, sessionId);
    if (found) {
      return found;
    }
  }

  return undefined;
}

/**
 * Gets the child sessions for a given session ID.
 * Returns an empty array if the session is not found or has no children.
 *
 * @param nodes - Array of root session nodes to search
 * @param sessionId - The session ID to find children for
 * @returns Array of child SessionNodes (may be empty)
 */
export function getChildSessions(nodes: SessionNode[], sessionId: string): SessionNode[] {
  const node = findSessionNode(nodes, sessionId);
  return node?.children ?? [];
}
