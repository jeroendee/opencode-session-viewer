import { useState, useCallback, type MouseEvent, type KeyboardEvent } from 'react';
import { ChevronRight, ChevronDown, Wrench } from 'lucide-react';
import type { SessionNode } from '../store/sessionStore';
import { parseSubAgentTitle } from '../utils/subAgentParsing';

export interface SubAgentTreeProps {
  sessionId: string;
  childSessions: SessionNode[];
  onNavigate: (sessionId: string) => void;
}

/**
 * Renders a single sub-agent tree item with nested children support.
 */
function SubAgentTreeItem({
  node,
  depth,
  onNavigate,
}: {
  node: SessionNode;
  depth: number;
  onNavigate: (sessionId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(true);
  const paddingLeft = 16 + depth * 20;

  const subAgentInfo = parseSubAgentTitle(node.session.title);
  const displayTitle = subAgentInfo?.displayTitle || node.session.title || 'Untitled Session';
  const SubAgentIcon = subAgentInfo?.icon || Wrench;

  const handleClick = useCallback(() => {
    onNavigate(node.session.id);
  }, [onNavigate, node.session.id]);

  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      setIsExpanded((prev) => !prev);
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onNavigate(node.session.id);
      } else if (hasChildren && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (e.key === 'ArrowRight' && !isExpanded) {
          setIsExpanded(true);
        } else if (e.key === 'ArrowLeft' && isExpanded) {
          setIsExpanded(false);
        }
      }
    },
    [hasChildren, isExpanded, onNavigate, node.session.id]
  );

  // Get the tree branch character based on depth and position
  const getBranchPrefix = () => {
    if (depth === 0) return '';
    return '\u251C\u2500'; // ├─
  };

  return (
    <>
      <div
        role="treeitem"
        tabIndex={0}
        aria-expanded={hasChildren ? isExpanded : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className="
          flex items-center gap-2 py-1.5 px-2 text-sm rounded-md cursor-pointer
          transition-colors duration-150 ease-in-out
          text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700
        "
        style={{ paddingLeft: `${paddingLeft}px` }}
        data-testid="sub-agent-tree-item"
      >
        {/* Expand/collapse chevron for items with children */}
        {hasChildren ? (
          <button
            type="button"
            onClick={handleToggle}
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
            className="flex-shrink-0 p-0.5 -ml-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            {isExpanded ? (
              <ChevronDown className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        ) : (
          <span className="w-3.5 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Tree branch indicator for nested items */}
        {depth > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs flex-shrink-0 font-mono" aria-hidden="true">
            {getBranchPrefix()}
          </span>
        )}

        {/* Sub-agent icon */}
        <SubAgentIcon
          className="w-4 h-4 flex-shrink-0 text-gray-500 dark:text-gray-400"
          aria-hidden="true"
        />

        {/* Title */}
        <span className="flex-1 truncate" title={displayTitle}>
          {displayTitle}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div role="group" className="animate-in slide-in-from-top-1 duration-150">
          {node.children.map((child) => (
            <SubAgentTreeItem
              key={child.session.id}
              node={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * SubAgentTree - Displays a tree of sub-agent sessions spawned from the current session.
 *
 * Features:
 * - Only renders if the session has child sessions
 * - Collapsible section (starts expanded)
 * - Click to navigate to sub-agent session
 * - Shows agent type icon and description
 * - Supports nested sub-agents
 */
export function SubAgentTree({ sessionId, childSessions, onNavigate }: SubAgentTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const handleToggleSection = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  // Don't render if no children
  if (childSessions.length === 0) {
    return null;
  }

  return (
    <div
      className="mb-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50"
      data-testid="sub-agent-tree"
    >
      {/* Header */}
      <button
        type="button"
        onClick={handleToggleSection}
        aria-expanded={isExpanded}
        aria-controls={`sub-agents-${sessionId}`}
        className="
          w-full flex items-center gap-2 px-3 py-2 text-sm font-medium
          text-gray-700 dark:text-gray-300
          hover:bg-gray-100 dark:hover:bg-gray-700
          rounded-t-lg transition-colors duration-150 ease-in-out
        "
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        )}
        <span>Sub-agents spawned ({childSessions.length})</span>
      </button>

      {/* Content */}
      {isExpanded && (
        <div
          id={`sub-agents-${sessionId}`}
          role="tree"
          aria-label="Sub-agent sessions"
          className="px-2 pb-2"
        >
          {childSessions.map((node) => (
            <SubAgentTreeItem
              key={node.session.id}
              node={node}
              depth={0}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
