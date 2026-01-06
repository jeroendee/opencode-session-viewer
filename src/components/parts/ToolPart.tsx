import { useState, useMemo } from 'react';
import { Check, X, Loader2, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { ToolPart as ToolPartType } from '../../types/session';
import { isToolCompleted, isToolError } from '../../types/session';
import { ToolIcon } from './toolIcons';
import { formatDurationCompact } from '../../utils/formatters';
import { useSessionNavigation } from '../../contexts/SessionNavigationContext';
import { findSpawnedSession } from '../../utils/subtaskMatcher';
import { EmbeddedSession } from './EmbeddedSession';
import { useSearchContextSafe } from '../../contexts/SearchContext';
import { HighlightedText } from '../../utils/highlightText';

interface ToolPartProps {
  part: ToolPartType;
}

type ToolStyleType = 'task' | 'skill' | 'default';

/**
 * Returns the style type for a tool based on its name.
 */
function getToolStyleType(toolName: string): ToolStyleType {
  switch (toolName) {
    case 'task':
      return 'task';
    case 'skill':
      return 'skill';
    default:
      return 'default';
  }
}

/**
 * Returns color classes for the tool based on its style type.
 */
function getToolColors(styleType: ToolStyleType) {
  switch (styleType) {
    case 'task':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        border: 'border border-amber-200 dark:border-amber-700',
        hoverBg: 'hover:bg-amber-100 dark:hover:bg-amber-900/30',
        chevron: 'text-amber-400 dark:text-amber-500',
        icon: 'text-amber-500 dark:text-amber-400',
        text: 'text-amber-700 dark:text-amber-300',
        titleText: 'text-amber-600 dark:text-amber-400',
        label: 'text-amber-500 dark:text-amber-400',
        preBg: 'bg-amber-100 dark:bg-amber-800/30',
        preText: 'text-amber-800 dark:text-amber-200',
      };
    case 'skill':
      return {
        bg: 'bg-teal-50 dark:bg-teal-900/20',
        border: 'border border-teal-200 dark:border-teal-700',
        hoverBg: 'hover:bg-teal-100 dark:hover:bg-teal-900/30',
        chevron: 'text-teal-400 dark:text-teal-500',
        icon: 'text-teal-500 dark:text-teal-400',
        text: 'text-teal-700 dark:text-teal-300',
        titleText: 'text-teal-600 dark:text-teal-400',
        label: 'text-teal-500 dark:text-teal-400',
        preBg: 'bg-teal-100 dark:bg-teal-800/30',
        preText: 'text-teal-800 dark:text-teal-200',
      };
    default:
      return {
        bg: 'bg-gray-100 dark:bg-gray-700',
        border: '',
        hoverBg: 'hover:bg-gray-200 dark:hover:bg-gray-600',
        chevron: 'text-gray-400 dark:text-gray-500',
        icon: 'text-gray-500 dark:text-gray-400',
        text: 'text-gray-700 dark:text-gray-300',
        titleText: 'text-gray-500 dark:text-gray-400',
        label: 'text-gray-500 dark:text-gray-400',
        preBg: 'bg-gray-100 dark:bg-gray-700',
        preText: 'text-gray-800 dark:text-gray-200',
      };
  }
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'completed':
      return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
    case 'error':
      return <X className="w-4 h-4 text-red-600 dark:text-red-400" />;
    case 'running':
      return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    default:
      return <Loader2 className="w-4 h-4 text-gray-400" />;
  }
}

function formatInput(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

/**
 * Extracts task tool parameters from input to find spawned session.
 */
function getTaskParams(input: unknown): { agent: string; description: string } | null {
  if (typeof input !== 'object' || input === null) return null;
  const obj = input as Record<string, unknown>;
  
  // Task tool uses subagent_type for agent
  const agent = obj.subagent_type;
  const description = obj.description;
  
  if (typeof agent === 'string' && typeof description === 'string') {
    return { agent, description };
  }
  return null;
}

export function ToolPart({ part }: ToolPartProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const sessionNav = useSessionNavigation();
  const { searchQuery } = useSearchContextSafe();

  const { state } = part;
  const title = isToolCompleted(state) ? state.title : undefined;
  const hasDetails = isToolCompleted(state) || isToolError(state);
  const styleType = getToolStyleType(part.tool);
  const colors = getToolColors(styleType);
  const hasSpecialStyling = styleType !== 'default';

  // Calculate duration if available
  let duration: number | undefined;
  if (isToolCompleted(state) || isToolError(state)) {
    duration = state.time.end - state.time.start;
  }

  // For task tools, find the spawned session
  const spawnedSession = useMemo(() => {
    if (part.tool !== 'task' || !sessionNav || !hasDetails) return null;
    
    const input = isToolCompleted(state) || isToolError(state) ? state.input : null;
    const taskParams = input ? getTaskParams(input) : null;
    if (!taskParams) return null;
    
    // Create a pseudo-subtask to use the existing matcher
    const pseudoSubtask = {
      id: part.id,
      sessionID: part.sessionID,
      messageID: part.messageID,
      type: 'subtask' as const,
      agent: taskParams.agent,
      description: taskParams.description,
      prompt: '',
    };
    
    return findSpawnedSession(pseudoSubtask, sessionNav.allSessions);
  }, [part.tool, part.id, part.sessionID, part.messageID, sessionNav?.allSessions, state, hasDetails]);



  return (
    <div className="my-2" id={`part-${part.id}`}>
      {/* Collapsed chip / header */}
      <button
        onClick={() => hasDetails && setIsExpanded(!isExpanded)}
        disabled={!hasDetails}
        className={`
          inline-flex items-center gap-2 px-3 py-1.5 rounded-lg
          ${colors.bg} ${colors.border}
          ${hasDetails
            ? `cursor-pointer ${colors.hoverBg}`
            : 'cursor-default'
          }
          transition-colors text-left
        `}
        aria-expanded={hasDetails ? isExpanded : undefined}
        aria-label={hasDetails ? `${isExpanded ? 'Collapse' : 'Expand'} ${part.tool} tool details` : `${part.tool} tool`}
      >
        {/* Expand/collapse indicator */}
        {hasDetails && (
          <span className={colors.chevron}>
            {isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </span>
        )}

        {/* Tool icon */}
        <span className={colors.icon}>
          <ToolIcon toolName={part.tool} className="w-4 h-4" />
        </span>

        {/* Tool name */}
        <span className={`font-mono text-sm ${colors.text}`}>
          {part.tool}
        </span>

        {/* Title (if available) */}
        {title && (
          <span className={`text-sm truncate max-w-[300px] ${colors.titleText}`}>
            <HighlightedText text={title} query={searchQuery} />
          </span>
        )}

        {/* Status icon */}
        <StatusIcon status={state.status} />
      </button>

      {/* Expanded details */}
      {isExpanded && hasDetails && (
        <div className={`mt-2 ml-6 p-4 rounded-lg text-sm ${
          hasSpecialStyling
            ? `${colors.bg} ${colors.border}`
            : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
        }`}>
          {/* Input section */}
          <div className="mb-4">
            <div className={`text-xs font-semibold uppercase mb-1 ${colors.label}`}>
              Input
            </div>
            <pre className={`p-3 rounded overflow-x-auto text-xs font-mono max-h-48 overflow-y-auto ${colors.preBg} ${colors.preText}`}>
              {formatInput(state.input)}
            </pre>
          </div>

          {/* Output section (for completed) */}
          {isToolCompleted(state) && state.output && (
            <div className="mb-4">
              <div className={`text-xs font-semibold uppercase mb-1 ${colors.label}`}>
                Output
              </div>
              <pre className={`p-3 rounded overflow-x-auto text-xs font-mono max-h-64 overflow-y-auto whitespace-pre-wrap ${colors.preBg} ${colors.preText}`}>
                <HighlightedText text={state.output} query={searchQuery} />
              </pre>
            </div>
          )}

          {/* Error section (for error state) */}
          {isToolError(state) && (
            <div className="mb-4">
              <div className="text-xs font-semibold text-red-500 dark:text-red-400 uppercase mb-1">
                Error
              </div>
              <pre className="bg-red-50 dark:bg-red-900/20 p-3 rounded overflow-x-auto text-xs font-mono text-red-700 dark:text-red-300 max-h-48 overflow-y-auto whitespace-pre-wrap">
                <HighlightedText text={state.error} query={searchQuery} />
              </pre>
            </div>
          )}

          {/* Duration */}
          {duration !== undefined && (
            <div className={`flex items-center gap-1 text-xs ${colors.label}`}>
              <Clock className="w-3 h-3" />
              <span>Duration: {formatDurationCompact(duration)}</span>
            </div>
          )}

          {/* Embedded session for task tools */}
          {spawnedSession && (
            <EmbeddedSession sessionInfo={spawnedSession} />
          )}
        </div>
      )}
    </div>
  );
}
