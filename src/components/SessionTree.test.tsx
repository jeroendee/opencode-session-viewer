import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionTree, type SessionTreeProps } from './SessionTree';
import type { SessionNode } from '../store/sessionStore';
import type { SessionInfo } from '../types/session';

// Mock formatRelativeTime, formatDate, and buildSessionTooltip to avoid time-based flakiness
vi.mock('../utils/formatters', () => ({
  formatRelativeTime: vi.fn((timestamp: number) => {
    // Return predictable values based on timestamp for testing
    const now = Date.now();
    const diff = now - timestamp;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return 'just now';
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    return '1 day ago';
  }),
  formatDate: vi.fn((timestamp: number) => {
    const date = new Date(timestamp);
    return `Jan ${date.getDate()} 2024 12:00`;
  }),
  buildSessionTooltip: vi.fn((session: { id: string; title: string; time: { updated: number } }, options?: { displayTitle?: string }) => {
    const title = options?.displayTitle || session.title || 'Untitled Session';
    const date = new Date(session.time.updated);
    return `${title}\nID: ${session.id}\nJan ${date.getDate()} 2024 12:00`;
  }),
}));

// Helper to create mock SessionInfo
const createMockSessionInfo = (
  id: string,
  title: string,
  updatedOffset: number = 0, // hours ago
  parentID?: string
): SessionInfo => ({
  id,
  version: '1.0',
  projectID: 'project-1',
  directory: '/test',
  title,
  parentID,
  time: {
    created: Date.now() - updatedOffset * 60 * 60 * 1000,
    updated: Date.now() - updatedOffset * 60 * 60 * 1000,
  },
});

// Helper to create mock SessionNode
const createMockSessionNode = (
  session: SessionInfo,
  children: SessionNode[] = []
): SessionNode => ({
  session,
  children,
});

describe('SessionTree', () => {
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTree = (props: Partial<SessionTreeProps> = {}) => {
    const defaultProps: SessionTreeProps = {
      nodes: [],
      selectedId: null,
      onSelect: mockOnSelect,
      ...props,
    };
    return render(<SessionTree {...defaultProps} />);
  };

  describe('rendering', () => {
    it('renders flat list of sessions', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Implement feature X', 2)),
        createMockSessionNode(createMockSessionInfo('session-2', 'Fix bug Y', 24)),
      ];

      renderTree({ nodes });

      expect(screen.getByText('Implement feature X')).toBeInTheDocument();
      expect(screen.getByText('Fix bug Y')).toBeInTheDocument();
    });

    it('renders nothing when nodes array is empty', () => {
      const { container } = renderTree({ nodes: [] });
      
      expect(container.querySelector('[role="tree"]')).not.toBeInTheDocument();
    });

    it('renders tree role and label', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Test session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      expect(tree).toHaveAttribute('aria-label', 'Session tree');
    });

    it('shows "Untitled Session" for sessions without titles', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', '')),
      ];

      renderTree({ nodes });

      expect(screen.getByText('Untitled Session')).toBeInTheDocument();
    });
  });

  describe('nested sessions', () => {
    it('renders nested sessions with proper indentation', () => {
      const childSession = createMockSessionNode(
        createMockSessionInfo('child-1', 'Child session', 1, 'parent-1')
      );
      const parentSession = createMockSessionNode(
        createMockSessionInfo('parent-1', 'Parent session', 2),
        [childSession]
      );

      renderTree({ nodes: [parentSession] });

      expect(screen.getByText('Parent session')).toBeInTheDocument();
      expect(screen.getByText('Child session')).toBeInTheDocument();

      // Check indentation via style - parent should have less padding than child
      const items = screen.getAllByTestId('session-tree-item');
      expect(items).toHaveLength(2);
      
      // Parent at depth 0 should have 8px padding, child at depth 1 should have 24px
      expect(items[0]).toHaveStyle({ paddingLeft: '8px' });
      expect(items[1]).toHaveStyle({ paddingLeft: '24px' });
    });

    it('renders deeply nested sessions', () => {
      const grandchild = createMockSessionNode(
        createMockSessionInfo('grandchild', 'Grandchild', 0)
      );
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child', 1),
        [grandchild]
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent', 2),
        [child]
      );

      renderTree({ nodes: [parent] });

      expect(screen.getByText('Parent')).toBeInTheDocument();
      expect(screen.getByText('Child')).toBeInTheDocument();
      expect(screen.getByText('Grandchild')).toBeInTheDocument();

      // Check progressive indentation
      const items = screen.getAllByTestId('session-tree-item');
      expect(items).toHaveLength(3);
      expect(items[0]).toHaveStyle({ paddingLeft: '8px' });  // depth 0
      expect(items[1]).toHaveStyle({ paddingLeft: '24px' }); // depth 1
      expect(items[2]).toHaveStyle({ paddingLeft: '40px' }); // depth 2
    });
  });

  describe('expand/collapse', () => {
    it('starts with nodes with children expanded', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child session')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent session'),
        [child]
      );

      renderTree({ nodes: [parent] });

      // Child should be visible (parent expanded by default)
      expect(screen.getByText('Child session')).toBeInTheDocument();
      
      // Parent should have aria-expanded="true"
      const parentItem = screen.getByText('Parent session').closest('[role="treeitem"]');
      expect(parentItem).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses node when clicking chevron', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child session')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent session'),
        [child]
      );

      renderTree({ nodes: [parent] });

      // Initially expanded
      expect(screen.getByText('Child session')).toBeInTheDocument();

      // Click collapse button
      const collapseButton = screen.getByRole('button', { name: 'Collapse' });
      fireEvent.click(collapseButton);

      // Child should be hidden
      expect(screen.queryByText('Child session')).not.toBeInTheDocument();
      
      // aria-expanded should be false
      const parentItem = screen.getByText('Parent session').closest('[role="treeitem"]');
      expect(parentItem).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands collapsed node when clicking chevron', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child session')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent session'),
        [child]
      );

      renderTree({ nodes: [parent] });

      // Collapse first
      const collapseButton = screen.getByRole('button', { name: 'Collapse' });
      fireEvent.click(collapseButton);
      expect(screen.queryByText('Child session')).not.toBeInTheDocument();

      // Expand again
      const expandButton = screen.getByRole('button', { name: 'Expand' });
      fireEvent.click(expandButton);

      // Child should be visible again
      expect(screen.getByText('Child session')).toBeInTheDocument();
    });

    it('does not show chevron for nodes without children', () => {
      const leaf = createMockSessionNode(
        createMockSessionInfo('leaf', 'Leaf session')
      );

      renderTree({ nodes: [leaf] });

      expect(screen.queryByRole('button', { name: /Expand|Collapse/ })).not.toBeInTheDocument();
    });

    it('toggles with keyboard arrow keys', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child session')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent session'),
        [child]
      );

      renderTree({ nodes: [parent] });

      const tree = screen.getByRole('tree');

      // Focus the parent item
      const parentItem = screen.getByText('Parent session').closest('[role="treeitem"]') as HTMLElement;
      act(() => {
        parentItem.focus();
        parentItem.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });

      // Press ArrowLeft on tree to collapse
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowLeft' });
      });
      expect(screen.queryByText('Child session')).not.toBeInTheDocument();

      // Press ArrowRight on tree to expand
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowRight' });
      });
      expect(screen.getByText('Child session')).toBeInTheDocument();
    });
  });

  describe('selection', () => {
    it('calls onSelect when clicking a session', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Test session')),
      ];

      renderTree({ nodes });

      const sessionItem = screen.getByText('Test session').closest('[role="treeitem"]')!;
      fireEvent.click(sessionItem);

      expect(mockOnSelect).toHaveBeenCalledWith('session-1');
    });

    it('calls onSelect when pressing Enter', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Test session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const sessionItem = screen.getByText('Test session').closest('[role="treeitem"]') as HTMLElement;
      
      // Focus the item first
      act(() => {
        sessionItem.focus();
        sessionItem.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });
      
      // Press Enter on the tree container
      act(() => {
        fireEvent.keyDown(tree, { key: 'Enter' });
      });

      expect(mockOnSelect).toHaveBeenCalledWith('session-1');
    });

    it('calls onSelect when pressing Space', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Test session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const sessionItem = screen.getByText('Test session').closest('[role="treeitem"]') as HTMLElement;
      
      // Focus the item first
      act(() => {
        sessionItem.focus();
        sessionItem.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });
      
      // Press Space on the tree container
      act(() => {
        fireEvent.keyDown(tree, { key: ' ' });
      });

      expect(mockOnSelect).toHaveBeenCalledWith('session-1');
    });

    it('displays selected state correctly with aria-current', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Selected session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Other session')),
      ];

      renderTree({ nodes, selectedId: 'session-1' });

      const selectedItem = screen.getByText('Selected session').closest('[role="treeitem"]');
      const otherItem = screen.getByText('Other session').closest('[role="treeitem"]');

      expect(selectedItem).toHaveAttribute('aria-current', 'true');
      expect(selectedItem).toHaveAttribute('aria-selected', 'true');
      expect(otherItem).not.toHaveAttribute('aria-current');
    });

    it('applies selection state to selected item via ARIA attributes', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Selected session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Other session')),
      ];

      renderTree({ nodes, selectedId: 'session-1' });

      const selectedItem = screen.getByText('Selected session').closest('[role="treeitem"]');
      const otherItem = screen.getByText('Other session').closest('[role="treeitem"]');

      // Check selection state via ARIA attributes (semantic, not class-based)
      expect(selectedItem).toHaveAttribute('aria-current', 'true');
      expect(selectedItem).toHaveAttribute('aria-selected', 'true');
      expect(otherItem).toHaveAttribute('aria-selected', 'false');
      expect(otherItem).not.toHaveAttribute('aria-current');
    });
  });

  describe('sub-agent detection', () => {
    it('displays explore agent with search icon and shortened title', () => {
      const nodes = [
        createMockSessionNode(
          createMockSessionInfo('session-1', '@explore subagent: Find configuration files')
        ),
      ];

      renderTree({ nodes });

      // Should show shortened title (not the full "@explore subagent: ..." prefix)
      expect(screen.getByText('Find configuration files')).toBeInTheDocument();
      expect(screen.queryByText('@explore subagent: Find configuration files')).not.toBeInTheDocument();
    });

    it('displays code-reviewer agent with checkmark icon', () => {
      const nodes = [
        createMockSessionNode(
          createMockSessionInfo('session-1', '@code-reviewer subagent: Review changes')
        ),
      ];

      renderTree({ nodes });

      expect(screen.getByText('Review changes')).toBeInTheDocument();
    });

    it('handles case-insensitive agent names', () => {
      const nodes = [
        createMockSessionNode(
          createMockSessionInfo('session-1', '@EXPLORE subagent: Case insensitive test')
        ),
      ];

      renderTree({ nodes });

      expect(screen.getByText('Case insensitive test')).toBeInTheDocument();
    });

    it('displays unknown agent with wrench icon', () => {
      const nodes = [
        createMockSessionNode(
          createMockSessionInfo('session-1', '@custom-agent subagent: Unknown agent type')
        ),
      ];

      renderTree({ nodes });

      // Should still parse and display the description
      expect(screen.getByText('Unknown agent type')).toBeInTheDocument();
    });

    it('does not parse non-subagent titles', () => {
      const nodes = [
        createMockSessionNode(
          createMockSessionInfo('session-1', 'Regular session title')
        ),
      ];

      renderTree({ nodes });

      expect(screen.getByText('Regular session title')).toBeInTheDocument();
    });
  });

  describe('relative time display', () => {
    it('displays relative time for each session', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'Recent session', 0)),
        createMockSessionNode(createMockSessionInfo('session-2', 'Old session', 24)),
      ];

      renderTree({ nodes });

      // Based on our mock implementation
      expect(screen.getByText('just now')).toBeInTheDocument();
      expect(screen.getByText('1 day ago')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes for tree structure', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent'),
        [child]
      );

      renderTree({ nodes: [parent] });

      // Tree container
      expect(screen.getByRole('tree')).toBeInTheDocument();

      // Find tree items by test id for reliable counting
      const items = screen.getAllByTestId('session-tree-item');
      expect(items).toHaveLength(2);

      // Parent has aria-expanded
      expect(items[0]).toHaveAttribute('aria-expanded', 'true');

      // Child doesn't have aria-expanded (no children)
      expect(items[1]).not.toHaveAttribute('aria-expanded');
    });

    it('first item is focusable by default (roving tabindex)', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
      ];

      renderTree({ nodes });

      const items = screen.getAllByRole('treeitem');
      // First item should be focusable
      expect(items[0]).toHaveAttribute('tabIndex', '0');
      // Other items should not be in tab order
      expect(items[1]).toHaveAttribute('tabIndex', '-1');
    });

    it('selected item is focusable when nothing else is focused', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
      ];

      renderTree({ nodes, selectedId: 'session-2' });

      const items = screen.getAllByRole('treeitem');
      // Selected item should be focusable
      expect(items[1]).toHaveAttribute('tabIndex', '0');
      expect(items[0]).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('keyboard navigation', () => {
    // Helper to simulate focus on an item which triggers the focusin event
    const focusItem = (item: HTMLElement) => {
      act(() => {
        // Focus the item - this will trigger focusin event which the hook listens to
        item.focus();
        // Dispatch focusin event manually since JSDOM doesn't always bubble correctly
        item.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
      });
    };

    it('navigates down with ArrowDown', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
        createMockSessionNode(createMockSessionInfo('session-3', 'Third session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus first item
      focusItem(items[0]);

      // Navigate down
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowDown' });
      });

      // Second item should now be focused (tabindex 0)
      expect(items[1]).toHaveAttribute('tabIndex', '0');
      expect(items[0]).toHaveAttribute('tabIndex', '-1');
    });

    it('navigates up with ArrowUp', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
        createMockSessionNode(createMockSessionInfo('session-3', 'Third session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus second item directly
      focusItem(items[1]);

      // Now navigate up
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowUp' });
      });

      // First item should be focused
      expect(items[0]).toHaveAttribute('tabIndex', '0');
      expect(items[1]).toHaveAttribute('tabIndex', '-1');
    });

    it('wraps from last to first with ArrowDown', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus last item
      focusItem(items[1]);

      // Navigate down (should wrap)
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowDown' });
      });

      // Should wrap to first
      expect(items[0]).toHaveAttribute('tabIndex', '0');
    });

    it('navigates to parent with ArrowLeft on leaf node', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child session')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent session'),
        [child]
      );

      renderTree({ nodes: [parent] });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus on child (second item since parent is expanded)
      focusItem(items[1]);

      // Press ArrowLeft to go to parent
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowLeft' });
      });

      // Parent should now be focused
      expect(items[0]).toHaveAttribute('tabIndex', '0');
      expect(items[1]).toHaveAttribute('tabIndex', '-1');
    });

    it('moves to first child with ArrowRight on expanded parent', () => {
      const child = createMockSessionNode(
        createMockSessionInfo('child', 'Child session')
      );
      const parent = createMockSessionNode(
        createMockSessionInfo('parent', 'Parent session'),
        [child]
      );

      renderTree({ nodes: [parent] });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus parent
      focusItem(items[0]);

      // Press ArrowRight - already expanded, should move to child
      act(() => {
        fireEvent.keyDown(tree, { key: 'ArrowRight' });
      });

      // Child should now be focused
      expect(items[1]).toHaveAttribute('tabIndex', '0');
      expect(items[0]).toHaveAttribute('tabIndex', '-1');
    });

    it('navigates to first item with Home', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
        createMockSessionNode(createMockSessionInfo('session-3', 'Third session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus third item
      focusItem(items[2]);

      // Press Home
      act(() => {
        fireEvent.keyDown(tree, { key: 'Home' });
      });

      // First item should be focused
      expect(items[0]).toHaveAttribute('tabIndex', '0');
      expect(items[2]).toHaveAttribute('tabIndex', '-1');
    });

    it('navigates to last item with End', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-1', 'First session')),
        createMockSessionNode(createMockSessionInfo('session-2', 'Second session')),
        createMockSessionNode(createMockSessionInfo('session-3', 'Third session')),
      ];

      renderTree({ nodes });

      const tree = screen.getByRole('tree');
      const items = screen.getAllByRole('treeitem');

      // Focus first item
      focusItem(items[0]);

      // Press End
      act(() => {
        fireEvent.keyDown(tree, { key: 'End' });
      });

      // Last item should be focused
      expect(items[2]).toHaveAttribute('tabIndex', '0');
      expect(items[0]).toHaveAttribute('tabIndex', '-1');
    });
  });

  describe('session item tooltips', () => {
    it('shows rich tooltip with title, ID, and datetime', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-abc-123', 'Test session', 2)),
      ];

      renderTree({ nodes });

      // Find the title span within the tree item
      const titleSpan = screen.getByText('Test session');
      const title = titleSpan.getAttribute('title');

      // Tooltip should contain the session title
      expect(title).toContain('Test session');
      // Tooltip should contain the session ID
      expect(title).toContain('ID: session-abc-123');
      // Tooltip should contain a formatted date
      expect(title).toMatch(/Jan \d+ 2024/);
    });

    it('shows "Untitled Session" in tooltip for sessions without titles', () => {
      const nodes = [
        createMockSessionNode(createMockSessionInfo('session-no-title', '', 0)),
      ];

      renderTree({ nodes });

      const titleSpan = screen.getByText('Untitled Session');
      const title = titleSpan.getAttribute('title');

      expect(title).toContain('Untitled Session');
      expect(title).toContain('ID: session-no-title');
    });

    it('shows shortened title in tooltip for sub-agent sessions', () => {
      const nodes = [
        createMockSessionNode(
          createMockSessionInfo('agent-session', '@explore subagent: Find files')
        ),
      ];

      renderTree({ nodes });

      // The displayed text should be shortened
      const titleSpan = screen.getByText('Find files');
      const title = titleSpan.getAttribute('title');

      // Tooltip should show the shortened display title, not the full original
      expect(title).toContain('Find files');
      expect(title).toContain('ID: agent-session');
    });
  });
});
