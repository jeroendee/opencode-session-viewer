import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { 
  useKeyboardNavigation, 
  flattenVisibleItems, 
  type NavigableItem,
  type KeyboardNavigationConfig 
} from './useKeyboardNavigation';
import type { KeyboardEvent } from 'react';

describe('useKeyboardNavigation', () => {
  const mockOnSelect = vi.fn();
  const mockOnExpand = vi.fn();
  const mockOnCollapse = vi.fn();

  const createItems = (count: number): NavigableItem[] => {
    return Array.from({ length: count }, (_, i) => ({
      id: `item-${i}`,
      hasChildren: false,
      isExpanded: false,
      parentId: null,
    }));
  };

  const createKeyEvent = (key: string): KeyboardEvent => {
    return {
      key,
      preventDefault: vi.fn(),
    } as unknown as KeyboardEvent;
  };

  const createMockContainerRef = () => {
    const container = document.createElement('div');
    return { current: container };
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderNavigationHook = (overrides: Partial<KeyboardNavigationConfig> = {}) => {
    const containerRef = createMockContainerRef();
    const config: KeyboardNavigationConfig = {
      items: createItems(5),
      selectedId: null,
      onSelect: mockOnSelect,
      onExpand: mockOnExpand,
      onCollapse: mockOnCollapse,
      containerRef,
      enabled: true,
      ...overrides,
    };
    return renderHook(() => useKeyboardNavigation(config));
  };

  describe('arrow navigation', () => {
    it('moves focus down with ArrowDown', () => {
      const { result } = renderNavigationHook();
      
      // Set initial focus
      act(() => {
        result.current.setFocusedId('item-0');
      });

      const event = createKeyEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedId).toBe('item-1');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('moves focus up with ArrowUp', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-2');
      });

      const event = createKeyEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedId).toBe('item-1');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('wraps to first item when pressing ArrowDown at the end', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-4'); // Last item
      });

      const event = createKeyEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedId).toBe('item-0');
    });

    it('wraps to last item when pressing ArrowUp at the beginning', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-0');
      });

      const event = createKeyEvent('ArrowUp');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedId).toBe('item-4');
    });
  });

  describe('selection', () => {
    it('selects focused item with Enter', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-2');
      });

      const event = createKeyEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnSelect).toHaveBeenCalledWith('item-2');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('selects focused item with Space', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-1');
      });

      const event = createKeyEvent(' ');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnSelect).toHaveBeenCalledWith('item-1');
    });

    it('does not select when nothing is focused', () => {
      const { result } = renderNavigationHook();

      const event = createKeyEvent('Enter');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnSelect).not.toHaveBeenCalled();
    });
  });

  describe('expand/collapse with ArrowRight/Left', () => {
    it('expands collapsed node with ArrowRight', () => {
      const items: NavigableItem[] = [
        { id: 'parent', hasChildren: true, isExpanded: false, parentId: null },
      ];
      const { result } = renderNavigationHook({ items });
      
      act(() => {
        result.current.setFocusedId('parent');
      });

      const event = createKeyEvent('ArrowRight');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnExpand).toHaveBeenCalledWith('parent');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('moves to first child with ArrowRight when already expanded', () => {
      const items: NavigableItem[] = [
        { id: 'parent', hasChildren: true, isExpanded: true, parentId: null },
        { id: 'child-1', hasChildren: false, isExpanded: false, parentId: 'parent' },
      ];
      const { result } = renderNavigationHook({ items });
      
      act(() => {
        result.current.setFocusedId('parent');
      });

      const event = createKeyEvent('ArrowRight');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnExpand).not.toHaveBeenCalled();
      expect(result.current.focusedId).toBe('child-1');
    });

    it('collapses expanded node with ArrowLeft', () => {
      const items: NavigableItem[] = [
        { id: 'parent', hasChildren: true, isExpanded: true, parentId: null },
        { id: 'child-1', hasChildren: false, isExpanded: false, parentId: 'parent' },
      ];
      const { result } = renderNavigationHook({ items });
      
      act(() => {
        result.current.setFocusedId('parent');
      });

      const event = createKeyEvent('ArrowLeft');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnCollapse).toHaveBeenCalledWith('parent');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('moves to parent with ArrowLeft when collapsed or leaf', () => {
      const items: NavigableItem[] = [
        { id: 'parent', hasChildren: true, isExpanded: true, parentId: null },
        { id: 'child-1', hasChildren: false, isExpanded: false, parentId: 'parent' },
      ];
      const { result } = renderNavigationHook({ items });
      
      act(() => {
        result.current.setFocusedId('child-1');
      });

      const event = createKeyEvent('ArrowLeft');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnCollapse).not.toHaveBeenCalled();
      expect(result.current.focusedId).toBe('parent');
    });

    it('does nothing with ArrowLeft at root collapsed node', () => {
      const items: NavigableItem[] = [
        { id: 'root', hasChildren: false, isExpanded: false, parentId: null },
      ];
      const { result } = renderNavigationHook({ items });
      
      act(() => {
        result.current.setFocusedId('root');
      });

      const event = createKeyEvent('ArrowLeft');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(mockOnCollapse).not.toHaveBeenCalled();
      expect(result.current.focusedId).toBe('root');
    });
  });

  describe('Home/End navigation', () => {
    it('moves to first item with Home', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-3');
      });

      const event = createKeyEvent('Home');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedId).toBe('item-0');
      expect(event.preventDefault).toHaveBeenCalled();
    });

    it('moves to last item with End', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-1');
      });

      const event = createKeyEvent('End');
      act(() => {
        result.current.handleKeyDown(event);
      });

      expect(result.current.focusedId).toBe('item-4');
      expect(event.preventDefault).toHaveBeenCalled();
    });
  });

  describe('roving tabindex', () => {
    it('returns tabIndex 0 for focused item', () => {
      const { result } = renderNavigationHook();
      
      act(() => {
        result.current.setFocusedId('item-2');
      });

      expect(result.current.getTabIndex('item-2')).toBe(0);
      expect(result.current.getTabIndex('item-0')).toBe(-1);
      expect(result.current.getTabIndex('item-3')).toBe(-1);
    });

    it('returns tabIndex 0 for selected item when nothing is focused', () => {
      const { result } = renderNavigationHook({ selectedId: 'item-3' });

      expect(result.current.getTabIndex('item-3')).toBe(0);
      expect(result.current.getTabIndex('item-0')).toBe(-1);
    });

    it('returns tabIndex 0 for first item when nothing is focused or selected', () => {
      const { result } = renderNavigationHook({ selectedId: null });

      expect(result.current.getTabIndex('item-0')).toBe(0);
      expect(result.current.getTabIndex('item-1')).toBe(-1);
    });
  });

  describe('disabled state', () => {
    it('does not respond to keyboard when disabled', () => {
      const { result } = renderNavigationHook({ enabled: false });
      
      act(() => {
        result.current.setFocusedId('item-0');
      });

      const event = createKeyEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      // Focus should not change
      expect(result.current.focusedId).toBe('item-0');
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('empty items', () => {
    it('handles empty items list gracefully', () => {
      const { result } = renderNavigationHook({ items: [] });

      const event = createKeyEvent('ArrowDown');
      act(() => {
        result.current.handleKeyDown(event);
      });

      // Should not throw and should not call preventDefault
      expect(event.preventDefault).not.toHaveBeenCalled();
    });
  });
});

describe('flattenVisibleItems', () => {
  interface TreeNode {
    id: string;
    children?: TreeNode[];
  }

  it('flattens a simple list without children', () => {
    const nodes: TreeNode[] = [
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ];
    const expandedIds = new Set<string>();
    
    const result = flattenVisibleItems(nodes, expandedIds);
    
    expect(result).toEqual([
      { id: 'a', hasChildren: false, isExpanded: false, parentId: null },
      { id: 'b', hasChildren: false, isExpanded: false, parentId: null },
      { id: 'c', hasChildren: false, isExpanded: false, parentId: null },
    ]);
  });

  it('includes children of expanded nodes', () => {
    const nodes: TreeNode[] = [
      { 
        id: 'parent', 
        children: [
          { id: 'child-1' },
          { id: 'child-2' },
        ] 
      },
    ];
    const expandedIds = new Set(['parent']);
    
    const result = flattenVisibleItems(nodes, expandedIds);
    
    expect(result).toEqual([
      { id: 'parent', hasChildren: true, isExpanded: true, parentId: null },
      { id: 'child-1', hasChildren: false, isExpanded: false, parentId: 'parent' },
      { id: 'child-2', hasChildren: false, isExpanded: false, parentId: 'parent' },
    ]);
  });

  it('excludes children of collapsed nodes', () => {
    const nodes: TreeNode[] = [
      { 
        id: 'parent', 
        children: [
          { id: 'child-1' },
          { id: 'child-2' },
        ] 
      },
    ];
    const expandedIds = new Set<string>(); // parent is collapsed
    
    const result = flattenVisibleItems(nodes, expandedIds);
    
    expect(result).toEqual([
      { id: 'parent', hasChildren: true, isExpanded: false, parentId: null },
    ]);
  });

  it('handles deeply nested expanded trees', () => {
    const nodes: TreeNode[] = [
      { 
        id: 'root', 
        children: [
          { 
            id: 'branch', 
            children: [
              { id: 'leaf' }
            ] 
          },
        ] 
      },
    ];
    const expandedIds = new Set(['root', 'branch']);
    
    const result = flattenVisibleItems(nodes, expandedIds);
    
    expect(result).toEqual([
      { id: 'root', hasChildren: true, isExpanded: true, parentId: null },
      { id: 'branch', hasChildren: true, isExpanded: true, parentId: 'root' },
      { id: 'leaf', hasChildren: false, isExpanded: false, parentId: 'branch' },
    ]);
  });

  it('handles mixed expanded and collapsed siblings', () => {
    const nodes: TreeNode[] = [
      { id: 'a', children: [{ id: 'a1' }] },
      { id: 'b', children: [{ id: 'b1' }] },
    ];
    const expandedIds = new Set(['a']); // only 'a' is expanded
    
    const result = flattenVisibleItems(nodes, expandedIds);
    
    expect(result).toEqual([
      { id: 'a', hasChildren: true, isExpanded: true, parentId: null },
      { id: 'a1', hasChildren: false, isExpanded: false, parentId: 'a' },
      { id: 'b', hasChildren: true, isExpanded: false, parentId: null },
    ]);
  });
});
