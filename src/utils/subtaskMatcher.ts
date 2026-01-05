import type { SessionNode } from '../store/sessionStore';
import type { SubtaskPart } from '../types/session';

/**
 * Parses a child session title to extract agent type and description.
 * Child session titles follow the pattern: "Description (@agent subagent)"
 * 
 * @param title - The session title to parse
 * @returns Parsed info or null if title doesn't match pattern
 */
export function parseChildSessionTitle(title: string): { agent: string; description: string } | null {
  // Match pattern: "Description (@agent subagent)" or "Description (@agent-name subagent)"
  const match = title.match(/^(.+?)\s+\(@([\w-]+)\s+subagent\)$/i);
  if (!match) {
    return null;
  }
  
  return {
    description: match[1].trim(),
    agent: match[2].toLowerCase(),
  };
}

/**
 * Finds the child session that was spawned by a SubtaskPart.
 * Matches by comparing the agent type and description.
 * 
 * @param subtask - The SubtaskPart to find the spawned session for
 * @param childSessions - Array of child SessionNodes to search
 * @returns The matching SessionNode or undefined if not found
 */
export function findSpawnedSession(
  subtask: SubtaskPart,
  childSessions: SessionNode[]
): SessionNode | undefined {
  const normalizedSubtaskAgent = subtask.agent.toLowerCase();
  const normalizedSubtaskDescription = subtask.description.toLowerCase().trim();
  
  for (const child of childSessions) {
    const parsed = parseChildSessionTitle(child.session.title);
    if (!parsed) {
      continue;
    }
    
    // Match agent type (case-insensitive)
    if (parsed.agent !== normalizedSubtaskAgent) {
      continue;
    }
    
    // Match description (case-insensitive, allow partial match at start)
    const normalizedChildDescription = parsed.description.toLowerCase();
    if (normalizedChildDescription === normalizedSubtaskDescription ||
        normalizedChildDescription.startsWith(normalizedSubtaskDescription) ||
        normalizedSubtaskDescription.startsWith(normalizedChildDescription)) {
      return child;
    }
  }
  
  return undefined;
}

/**
 * Gets the session ID of the child session spawned by a SubtaskPart.
 * 
 * @param subtask - The SubtaskPart to find the spawned session for
 * @param childSessions - Array of child SessionNodes to search
 * @returns The session ID or undefined if not found
 */
export function getSpawnedSessionId(
  subtask: SubtaskPart,
  childSessions: SessionNode[]
): string | undefined {
  const session = findSpawnedSession(subtask, childSessions);
  return session?.session.id;
}
