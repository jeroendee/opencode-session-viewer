import { useState, useCallback, useEffect, useRef, useMemo, type MouseEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import type { SessionNode } from '../store/sessionStore';
import { formatRelativeTime, buildSessionTooltip } from '../utils/formatters';
import { parseSubAgentTitle } from '../utils/subAgentParsing';
import { useKeyboardNavigation, flattenVisibleItems } from '../hooks/useKeyboardNavigation';

export interface SessionTreeProps {
  nodes: SessionNode[];
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
  depth?: number;
}

/**
 * Adapts SessionNode tree to format needed by flattenVisibleItems
 */
interface FlattenableNode {
  id: string;
  children: FlattenableNode[];
  parentId: string | null;
}

function toFlattenableNodes(nodes: SessionNode[], parentId: string | null = null): FlattenableNode[] {
  return nodes.map(node => ({
    id: node.session.id,
    parentId,
    children: toFlattenableNodes(node.children, node.session.id),
  }));
}

/**
 * Renders a single session tree item with optional expand/collapse.
 * Note: Children are rendered by the parent component (renderNode), not here.
 */
function SessionTreeItem({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
  tabIndex,
  itemRef,
  isFocused,
}: {
  node: SessionNode;
  depth: number;
  selectedId: string | null;
  onSelect: (sessionId: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (sessionId: string) => void;
  tabIndex: 0 | -1;
  itemRef: (el: HTMLElement | null) => void;
  isFocused: boolean;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedIds.has(node.session.id);
  const isSelected = selectedId === node.session.id;
  const paddingLeft = 8 + depth * 16;

  const subAgentInfo = parseSubAgentTitle(node.session.title);
  const displayTitle = subAgentInfo?.displayTitle || node.session.title || 'Untitled Session';
  const SubAgentIcon = subAgentInfo?.icon;
  const tooltip = buildSessionTooltip(node.session, { displayTitle });

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

  return (
    <div
      ref={itemRef}
      role="treeitem"
      tabIndex={tabIndex}
      aria-current={isSelected ? 'true' : undefined}
      aria-expanded={hasChildren ? isExpanded : undefined}
      aria-selected={isSelected}
      onClick={handleClick}
      className={`
        flex items-center gap-1.5 py-1.5 px-2 text-sm rounded-md cursor-pointer
        transition-colors duration-150 ease-in-out
        ${isSelected
          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
        ${isFocused && !isSelected
          ? 'ring-2 ring-blue-400 dark:ring-blue-500 ring-inset'
          : ''}
        focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 dark:focus-visible:ring-blue-500 focus-visible:ring-inset
      `}
      style={{ paddingLeft: `${paddingLeft}px` }}
      data-testid="session-tree-item"
      data-item-id={node.session.id}
    >
      {/* Expand/collapse chevron */}
      {hasChildren ? (
        <button
          type="button"
          onClick={handleToggle}
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
          className="flex-shrink-0 p-0.5 -ml-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          tabIndex={-1}
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
      <span className="flex-1 truncate" title={tooltip}>
        {displayTitle}
      </span>

      {/* Relative time */}
      <span className="flex-shrink-0 text-xs text-gray-500 dark:text-gray-400 tabular-nums">
        {formatRelativeTime(node.session.time.updated)}
      </span>
    </div>
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
 * - Keyboard navigation with arrow keys
 * - Roving tabindex for accessibility
 */
export function SessionTree({
  nodes,
  selectedId,
  onSelect,
  depth = 0,
}: SessionTreeProps) {
  const containerRef = useRef<HTMLDivElement>(null);

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

  const handleExpand = useCallback((sessionId: string) => {
    setExpandedIds((prev) => {
      if (prev.has(sessionId)) return prev;
      const next = new Set(prev);
      next.add(sessionId);
      return next;
    });
  }, []);

  const handleCollapse = useCallback((sessionId: string) => {
    setExpandedIds((prev) => {
      if (!prev.has(sessionId)) return prev;
      const next = new Set(prev);
      next.delete(sessionId);
      return next;
    });
  }, []);

  // Flatten nodes for keyboard navigation
  const flattenableNodes = useMemo(() => toFlattenableNodes(nodes), [nodes]);
  const visibleItems = useMemo(
    () => flattenVisibleItems(flattenableNodes, expandedIds),
    [flattenableNodes, expandedIds]
  );

  const { focusedId, handleKeyDown, getTabIndex, getItemRef } = useKeyboardNavigation({
    items: visibleItems,
    selectedId,
    onSelect,
    onExpand: handleExpand,
    onCollapse: handleCollapse,
    containerRef,
    enabled: nodes.length > 0,
  });

  // Recursive render function that passes keyboard navigation props
  const renderNode = useCallback((node: SessionNode, nodeDepth: number): React.ReactNode => {
    const hasChildren = node.children.length > 0;
    const isExpanded = expandedIds.has(node.session.id);

    return (
      <div key={node.session.id}>
        <SessionTreeItem
          node={node}
          depth={nodeDepth}
          selectedId={selectedId}
          onSelect={onSelect}
          expandedIds={expandedIds}
          onToggleExpand={handleToggleExpand}
          tabIndex={getTabIndex(node.session.id)}
          itemRef={getItemRef(node.session.id)}
          isFocused={focusedId === node.session.id}
        />
        {hasChildren && isExpanded && (
          <div role="group" className="animate-in slide-in-from-top-1 duration-150">
            {node.children.map((child) => renderNode(child, nodeDepth + 1))}
          </div>
        )}
      </div>
    );
  }, [expandedIds, selectedId, onSelect, handleToggleExpand, getTabIndex, getItemRef, focusedId]);

  if (nodes.length === 0) {
    return null;
  }

  const handleContainerKeyDown = (e: ReactKeyboardEvent) => {
    handleKeyDown(e);
  };

  return (
    <div 
      ref={containerRef}
      role="tree" 
      data-testid="session-tree" 
      aria-label="Session tree"
      onKeyDown={handleContainerKeyDown}
    >
      {nodes.map((node) => renderNode(node, depth))}
    </div>
  );
}
