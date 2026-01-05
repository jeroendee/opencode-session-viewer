import { useState, useMemo } from 'react';
import { Search, CheckCircle, Bot, Wrench, ChevronDown, ChevronRight, Terminal, ExternalLink } from 'lucide-react';
import type { SubtaskPart as SubtaskPartType } from '../../types/session';
import { useSessionNavigation } from '../../contexts/SessionNavigationContext';
import { getSpawnedSessionId } from '../../utils/subtaskMatcher';

interface SubtaskPartProps {
  part: SubtaskPartType;
}

/**
 * Returns the appropriate icon for a given agent type.
 */
function getAgentIcon(agentName: string) {
  switch (agentName.toLowerCase()) {
    case 'explore':
      return Search;
    case 'code-reviewer':
    case 'code-review':
      return CheckCircle;
    case 'task':
      return Bot;
    default:
      return Wrench;
  }
}

/**
 * Renders a subtask/sub-agent delegation part.
 * Shows the agent type, description, and expandable prompt section.
 * Uses SessionNavigationContext to link to child sessions when available.
 */
export function SubtaskPart({ part }: SubtaskPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sessionNav = useSessionNavigation();

  // Find the spawned session ID for this subtask
  // Searches all sessions for a matching title pattern
  const spawnedSessionId = useMemo(() => {
    if (!sessionNav || Object.keys(sessionNav.allSessions).length === 0) return undefined;
    return getSpawnedSessionId(part, sessionNav.allSessions);
  }, [part.agent, part.description, sessionNav?.allSessions]);

  const AgentIcon = getAgentIcon(part.agent);
  const hasLinkedSession = Boolean(spawnedSessionId && sessionNav);

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (spawnedSessionId && sessionNav) {
      sessionNav.navigateToSession(spawnedSessionId);
    }
  };

  return (
    <div className="my-2">
      {/* Collapsed chip / header */}
      <div className="inline-flex items-center gap-2">
        <button
          onClick={() => setIsExpanded((prev) => !prev)}
          className="
            inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
            bg-purple-50 dark:bg-purple-900/20
            border border-purple-200 dark:border-purple-700
            cursor-pointer hover:bg-purple-100 dark:hover:bg-purple-900/30
            transition-colors text-left
          "
          aria-expanded={isExpanded}
          aria-label={`${isExpanded ? 'Collapse' : 'Expand'} subtask details for ${part.agent} agent`}
        >
          {/* Expand/collapse indicator */}
          <span className="text-purple-400 dark:text-purple-500">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>

          {/* Agent icon */}
          <span className="text-purple-500 dark:text-purple-400" data-testid="agent-icon">
            <AgentIcon className="w-4 h-4" aria-hidden="true" />
          </span>

          {/* Delegation text */}
          <span className="text-sm text-purple-700 dark:text-purple-300">
            Delegated to <span className="font-semibold">{part.agent}</span> Agent
          </span>

          {/* Description */}
          <span className="text-sm text-purple-600 dark:text-purple-400 truncate max-w-[300px]">
            {part.description}
          </span>
        </button>

        {/* Navigate to session button */}
        {hasLinkedSession && (
          <button
            onClick={handleNavigate}
            className="
              inline-flex items-center gap-1 px-2 py-1 rounded
              bg-purple-100 dark:bg-purple-800/50
              text-purple-600 dark:text-purple-300
              hover:bg-purple-200 dark:hover:bg-purple-700
              text-xs font-medium transition-colors
            "
            aria-label="View sub-agent session"
            title="View sub-agent session"
          >
            <ExternalLink className="w-3 h-3" />
            <span>View</span>
          </button>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="mt-2 ml-6 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-sm">
          {/* Prompt section */}
          <div className="mb-4">
            <div className="text-xs font-semibold text-purple-500 dark:text-purple-400 uppercase mb-1">
              Prompt
            </div>
            <pre className="bg-purple-100 dark:bg-purple-800/30 p-3 rounded overflow-x-auto text-xs font-mono text-purple-800 dark:text-purple-200 max-h-64 overflow-y-auto whitespace-pre-wrap">
              {part.prompt}
            </pre>
          </div>

          {/* Command section (if present) */}
          {part.command && (
            <div className="flex items-center gap-2 text-xs text-purple-500 dark:text-purple-400">
              <Terminal className="w-3 h-3" />
              <span>Triggered by {part.command}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
