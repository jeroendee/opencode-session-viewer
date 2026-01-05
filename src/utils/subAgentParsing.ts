import { Search, CheckCircle, Bot, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Maps sub-agent names to their icons.
 */
export const subAgentIconMap: Record<string, LucideIcon> = {
  explore: Search,
  'code-reviewer': CheckCircle,
  'code-review': CheckCircle,
  task: Bot,
};

/**
 * Parses a session title to detect sub-agent patterns.
 * Pattern: "@<agent-name> subagent: <description>"
 *
 * @returns { icon, displayTitle } if it's a sub-agent session, null otherwise
 */
export function parseSubAgentTitle(
  title: string
): { icon: LucideIcon; displayTitle: string } | null {
  const match = title.match(/^@(\S+)\s+subagent:\s*(.+)$/i);
  if (!match) return null;

  const [, agentName, description] = match;
  const icon = subAgentIconMap[agentName.toLowerCase()] || Wrench;

  return { icon, displayTitle: description.trim() };
}
