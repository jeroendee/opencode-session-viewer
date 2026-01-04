import { useState, useCallback, useEffect, type MouseEvent, type KeyboardEvent } from 'react';
import { ChevronRight, ChevronDown, Search, CheckCircle, Bot, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { SessionNode } from '../store/sessionStore';
import { formatRelativeTime } from '../utils/formatters';

export interface SessionTreeProps {
  nodes: SessionNode[];
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
  depth?: number;
}

/**
 * Maps sub-agent names to their icons.
 */
const subAgentIconMap: Record<string, LucideIcon> = {
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
function parseSubAgentTitle(title: string): { icon: LucideIcon; displayTitle: string } | null {
  const match = title.match(/^@(\S+)\s+subagent:\s*(.+)$/i);
  if (!match) return null;

  const [, agentName, description] = match;
  const icon = subAgentIconMap[agentName.toLowerCase()] || Wrench;
  
  return { icon, displayTitle: description.trim() };
}

/**
 * Renders a single session tree item with optional expand/collapse.
 */
function SessionTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: {
  node: SessionNode;
  depth: number;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (sessionId: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.session.id);
  const isSelected = selectedId === node.session.id;
  const paddingLeft = 8 + depth * 16;

  const subAgentInfo = parseSubAgentTitle(node.session.title);
  const displayTitle = subAgentInfo?.displayTitle || node.session.title || 'Untitled Session';
  const SubAgentIcon = subAgentInfo?.icon;

  const handleClick = useCallback(() => {
    onSelect(node.session.id);
  }, [onSelect, node.session.id]);

  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      onToggleExpand(node.session.id);
    },
    [onToggleExpand, node.session.id]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onSelect(node.session.id);
      } else if (hasChildren && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (e.key === 'ArrowRight' && !isExpanded) {
          onToggleExpand(node.session.id);
        } else if (e.key === 'ArrowLeft' && isExpanded) {
          onToggleExpand(node.session.id);
        }
      }
    },
    [hasChildren, isExpanded, onSelect, onToggleExpand, node.session.id]
  );

  return (
    <>
      <div
        role="treeitem"
        tabIndex={0}
        aria-current={isSelected ? 'true' : undefined}
        aria-expanded={hasChildren ? isExpanded : undefined}
        aria-selected={isSelected}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={`
          flex items-center gap-1.5 py-1.5 px-2 text-sm rounded-md cursor-pointer
          transition-colors duration-150 ease-in-out
          ${isSelected
            ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
        `}
        style={{ paddingLeft: `${paddingLeft}px` }}
        data-testid="session-tree-item"
      >
        {/* Expand/collapse chevron */}
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
          // Spacer to align items without children
          <span className="w-3.5 flex-shrink-0" aria-hidden="true" />
        )}

        {/* Tree branch indicator for nested items */}
        {depth > 0 && (
          <span className="text-gray-400 dark:text-gray-500 text-xs flex-shrink-0" aria-hidden="true">
            ├─
          </span>
        )}

        {/* Sub-agent icon */}
        {SubAgentIcon && (
          <SubAgentIcon
            className="w-3.5 h-3.5 flex-shrink-0 text-gray-500 dark:text-gray-400"
            aria-hidden="true"
          />
        )}

        {/* Title */}
        <span className="flex-1 truncate" title={displayTitle}>
          {displayTitle}
        </span>

        {/* Relative time */}
        <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {formatRelativeTime(node.session.time.updated)}
        </span>
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <div
          role="group"
          className="animate-in slide-in-from-top-1 duration-150"
        >
          {node.children.map((child) => (
            <SessionTreeItem
              key={child.session.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * SessionTree - Renders a tree of sessions with expand/collapse support.
 *
 * Features:
 * - Recursive rendering for nested children
 * - Indentation based on depth
 * - Expand/collapse for nodes with children
 * - Icons for sub-agent types (explore, code-reviewer, etc.)
 * - Relative time display
 * - Selected state highlight with aria-current
 * - Click to select
 */
export function SessionTree({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: SessionTreeProps) {
  // Collect all expandable node IDs (nodes with children)
  const collectExpandableIds = useCallback((nodeList: SessionNode[]): Set<string> => {
    const ids = new Set<string>();
    const collect = (list: SessionNode[]) => {
      for (const node of list) {
        if (node.children.length > 0) {
          ids.add(node.session.id);
          collect(node.children);
        }
      }
    };
    collect(nodeList);
    return ids;
  }, []);

  // Initialize all nodes with children as expanded
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
    return collectExpandableIds(nodes);
  });

  // Sync expandedIds when nodes change - expand new nodes by default
  useEffect(() => {
    setExpandedIds((prev) => {
      const currentExpandableIds = collectExpandableIds(nodes);
      const next = new Set<string>();

      for (const id of currentExpandableIds) {
        if (prev.has(id)) {
          // Existing node that was expanded - keep it expanded
          next.add(id);
        } else if (prev.size === 0) {
          // Initial load - expand all
          next.add(id);
        } else {
          // New expandable node - expand by default
          next.add(id);
        }
      }

      return next;
    });
  }, [nodes, collectExpandableIds]);

  const handleToggleExpand = useCallback((sessionId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  if (nodes.length === 0) {
    return null;
  }

  return (
    <div role="tree" data-testid="session-tree" aria-label="Session tree">
      {nodes.map((node) => (
        <SessionTreeItem
          key={node.session.id}
          node={node}
          depth={depth}
          selectedId={selectedId}
          onSelect={onSelect}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
        />
      ))}
    </div>
  );
}
