import { useState } from 'react';
import { Search, CheckCircle, Bot, Wrench, ChevronDown, ChevronRight, Terminal } from 'lucide-react';
import type { SubtaskPart as SubtaskPartType } from '../../types/session';

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
 */
export function SubtaskPart({ part }: SubtaskPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const AgentIcon = getAgentIcon(part.agent);

  return (
    <div className="my-2">
      {/* Collapsed chip / header */}
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
