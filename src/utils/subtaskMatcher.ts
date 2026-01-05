import type { SessionInfo, SubtaskPart } from '../types/session';

/**
 * Parses a session title to extract agent type and description.
 * Session titles spawned by subtasks follow the pattern: "Description (@agent subagent)"
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
 * Finds the session that was spawned by a SubtaskPart.
 * Searches all sessions for one whose title matches the subtask's agent and description.
 * 
 * @param subtask - The SubtaskPart to find the spawned session for
 * @param allSessions - Record of all sessions keyed by ID
 * @returns The matching SessionInfo or undefined if not found
 */
export function findSpawnedSession(
  subtask: SubtaskPart,
  allSessions: Record<string, SessionInfo>
): SessionInfo | undefined {
  const normalizedSubtaskAgent = subtask.agent.toLowerCase();
  const normalizedSubtaskDescription = subtask.description.toLowerCase().trim();
  
  for (const session of Object.values(allSessions)) {
    const parsed = parseChildSessionTitle(session.title);
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
      return session;
    }
  }
  
  return undefined;
}

/**
 * Gets the session ID of the session spawned by a SubtaskPart.
 * 
 * @param subtask - The SubtaskPart to find the spawned session for
 * @param allSessions - Record of all sessions keyed by ID
 * @returns The session ID or undefined if not found
 */
export function getSpawnedSessionId(
  subtask: SubtaskPart,
  allSessions: Record<string, SessionInfo>
): string | undefined {
  const session = findSpawnedSession(subtask, allSessions);
  return session?.id;
}
