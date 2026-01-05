import { useState, useCallback, useEffect, useRef, type RefObject, type KeyboardEvent } from 'react';

/**
 * Represents an item in a navigable tree structure.
 */
export interface NavigableItem {
  id: string;
  hasChildren: boolean;
  isExpanded: boolean;
  parentId: string | null;
}

/**
 * Configuration for the keyboard navigation hook.
 */
export interface KeyboardNavigationConfig {
  /** Flat list of all visible items in order */
  items: NavigableItem[];
  /** Currently selected item ID */
  selectedId: string | null;
  /** Callback when an item is selected via Enter */
  onSelect: (id: string) => void;
  /** Callback when an item should be expanded */
  onExpand: (id: string) => void;
  /** Callback when an item should be collapsed */
  onCollapse: (id: string) => void;
  /** Container ref for focus management */
  containerRef: RefObject<HTMLElement | null>;
  /** Whether navigation is enabled */
  enabled?: boolean;
}

/**
 * Result of the keyboard navigation hook.
 */
export interface KeyboardNavigationResult {
  /** Currently focused item ID */
  focusedId: string | null;
  /** Set focus to a specific item */
  setFocusedId: (id: string | null) => void;
  /** Handle keyboard events on the container */
  handleKeyDown: (e: KeyboardEvent) => void;
  /** Get tabIndex for an item (-1 or 0 based on roving tabindex) */
  getTabIndex: (id: string) => 0 | -1;
  /** Get ref callback for registering item elements */
  getItemRef: (id: string) => (el: HTMLElement | null) => void;
}

/**
 * Hook for keyboard navigation in tree-like structures.
 * Implements roving tabindex pattern for accessible tree navigation.
 *
 * Keyboard controls:
 * - Arrow Up/Down: Navigate between items
 * - Enter: Select the focused item
 * - Left: Collapse expanded node or move to parent
 * - Right: Expand collapsed node or move to first child
 */
export function useKeyboardNavigation({
  items,
  selectedId,
  onSelect,
  onExpand,
  onCollapse,
  containerRef,
  enabled = true,
}: KeyboardNavigationConfig): KeyboardNavigationResult {
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());

  // Cleanup itemRefs on unmount
  useEffect(() => {
    const refs = itemRefs.current;
    return () => {
      refs.clear();
    };
  }, []);

  // Sync focusedId when an item receives DOM focus (e.g., via click or tab)
  useEffect(() => {
    if (!enabled) return;

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as Element;
      // Find the treeitem element (could be the target or an ancestor)
      const treeitem = target.closest('[role="treeitem"]');
      if (treeitem) {
        const itemId = treeitem.getAttribute('data-item-id');
        if (itemId) {
          setFocusedId(itemId);
        }
      }
    };

    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('focusin', handleFocusIn);
    return () => container.removeEventListener('focusin', handleFocusIn);
  }, [enabled, containerRef]);

  // Focus the first item when the container receives focus and no item is focused
  useEffect(() => {
    if (!enabled || items.length === 0) return;

    const container = containerRef.current;
    if (!container) return;

    const handleContainerFocus = (e: FocusEvent) => {
      // Only handle direct focus on container, not bubbled focus
      if (e.target !== container) return;
      
      // If no item is focused, focus the selected item or first item
      if (!focusedId) {
        const targetId = selectedId ?? items[0]?.id;
        if (targetId) {
          setFocusedId(targetId);
          itemRefs.current.get(targetId)?.focus();
        }
      }
    };

    container.addEventListener('focus', handleContainerFocus);
    return () => container.removeEventListener('focus', handleContainerFocus);
  }, [enabled, items, focusedId, selectedId, containerRef]);

  // Focus the DOM element when focusedId changes
  useEffect(() => {
    if (!enabled || !focusedId) return;
    const element = itemRefs.current.get(focusedId);
    if (element && document.activeElement !== element) {
      element.focus();
    }
  }, [enabled, focusedId]);

  // Reset focus when items change significantly (e.g., filtering)
  useEffect(() => {
    if (!enabled) return;
    if (focusedId && !items.some(item => item.id === focusedId)) {
      // Focused item is no longer visible
      setFocusedId(selectedId ?? items[0]?.id ?? null);
    }
  }, [enabled, items, focusedId, selectedId]);

  const getTabIndex = useCallback((id: string): 0 | -1 => {
    // Roving tabindex: only the focused item (or first item if none focused) has tabindex 0
    if (focusedId) {
      return id === focusedId ? 0 : -1;
    }
    // If nothing is focused, the selected item or first item should be focusable
    const defaultFocusable = selectedId ?? items[0]?.id;
    return id === defaultFocusable ? 0 : -1;
  }, [focusedId, selectedId, items]);

  const getItemRef = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) {
        itemRefs.current.set(id, el);
      } else {
        itemRefs.current.delete(id);
      }
    };
  }, []);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled || items.length === 0) return;

    const currentIndex = focusedId ? items.findIndex(item => item.id === focusedId) : -1;
    const currentItem = currentIndex >= 0 ? items[currentIndex] : null;

    switch (e.key) {
      case 'ArrowDown': {
        e.preventDefault();
        const nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        setFocusedId(items[nextIndex].id);
        break;
      }

      case 'ArrowUp': {
        e.preventDefault();
        const prevIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        setFocusedId(items[prevIndex].id);
        break;
      }

      case 'Enter':
      case ' ': {
        e.preventDefault();
        if (focusedId) {
          onSelect(focusedId);
        }
        break;
      }

      case 'ArrowRight': {
        if (!currentItem) break;
        e.preventDefault();
        
        if (currentItem.hasChildren) {
          if (!currentItem.isExpanded) {
            // Expand the node
            onExpand(currentItem.id);
          } else {
            // Already expanded - move to first child
            const childIndex = currentIndex + 1;
            if (childIndex < items.length) {
              const nextItem = items[childIndex];
              // Verify the next item is actually a child of the current item
              if (nextItem && nextItem.parentId === currentItem.id) {
                setFocusedId(nextItem.id);
              }
            }
          }
        }
        break;
      }

      case 'ArrowLeft': {
        if (!currentItem) break;
        e.preventDefault();
        
        if (currentItem.hasChildren && currentItem.isExpanded) {
          // Collapse the node
          onCollapse(currentItem.id);
        } else if (currentItem.parentId) {
          // Move to parent
          const parentIndex = items.findIndex(item => item.id === currentItem.parentId);
          if (parentIndex >= 0) {
            setFocusedId(items[parentIndex].id);
          }
        }
        break;
      }

      case 'Home': {
        e.preventDefault();
        if (items.length > 0) {
          setFocusedId(items[0].id);
        }
        break;
      }

      case 'End': {
        e.preventDefault();
        if (items.length > 0) {
          setFocusedId(items[items.length - 1].id);
        }
        break;
      }
    }
  }, [enabled, items, focusedId, onSelect, onExpand, onCollapse]);

  return {
    focusedId,
    setFocusedId,
    handleKeyDown,
    getTabIndex,
    getItemRef,
  };
}

/**
 * Flattens a tree structure into a list of visible items for navigation.
 * Only includes expanded nodes' children.
 */
export function flattenVisibleItems<T extends { id: string; children?: T[] }>(
  nodes: T[],
  expandedIds: Set<string>,
  parentId: string | null = null
): NavigableItem[] {
  const result: NavigableItem[] = [];
  
  for (const node of nodes) {
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expandedIds.has(node.id);
    
    result.push({
      id: node.id,
      hasChildren,
      isExpanded,
      parentId,
    });
    
    if (hasChildren && isExpanded && node.children) {
      result.push(...flattenVisibleItems(node.children, expandedIds, node.id));
    }
  }
  
  return result;
}
