import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SubAgentTree, type SubAgentTreeProps } from './SubAgentTree';
import type { SessionNode } from '../store/sessionStore';
import type { SessionInfo } from '../types/session';

// Helper to create mock SessionInfo
const createMockSessionInfo = (
  id: string,
  title: string,
  parentID?: string
): SessionInfo => ({
  id,
  version: '1.0',
  projectID: 'project-1',
  directory: '/test',
  title,
  parentID,
  time: {
    created: Date.now(),
    updated: Date.now(),
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

describe('SubAgentTree', () => {
  const mockOnNavigate = vi.fn();
  const defaultSessionId = 'parent-session';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderTree = (props: Partial<SubAgentTreeProps> = {}) => {
    const defaultProps: SubAgentTreeProps = {
      sessionId: defaultSessionId,
      childSessions: [],
      onNavigate: mockOnNavigate,
      ...props,
    };
    return render(<SubAgentTree {...defaultProps} />);
  };

  describe('empty state', () => {
    it('returns null when childSessions is empty', () => {
      const { container } = renderTree({ childSessions: [] });

      expect(container.querySelector('[data-testid="sub-agent-tree"]')).not.toBeInTheDocument();
    });
  });

  describe('rendering child sessions', () => {
    it('renders child sessions with icons', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find relevant files', defaultSessionId)
        ),
        createMockSessionNode(
          createMockSessionInfo('child-2', '@code-reviewer subagent: Review changes', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      expect(screen.getByText('Find relevant files')).toBeInTheDocument();
      expect(screen.getByText('Review changes')).toBeInTheDocument();
      expect(screen.getByText('Sub-agents spawned (2)')).toBeInTheDocument();
    });

    it('shows the header with correct count', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Task 1', defaultSessionId)
        ),
        createMockSessionNode(
          createMockSessionInfo('child-2', '@task subagent: Task 2', defaultSessionId)
        ),
        createMockSessionNode(
          createMockSessionInfo('child-3', '@code-reviewer subagent: Task 3', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      expect(screen.getByText('Sub-agents spawned (3)')).toBeInTheDocument();
    });

    it('displays sessions with unknown agent type using wrench icon', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@custom-agent subagent: Custom task', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      expect(screen.getByText('Custom task')).toBeInTheDocument();
    });

    it('handles non-subagent titles gracefully', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', 'Regular session title', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      expect(screen.getByText('Regular session title')).toBeInTheDocument();
    });
  });

  describe('navigation', () => {
    it('calls onNavigate when clicking a child session', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const item = screen.getByTestId('sub-agent-tree-item');
      fireEvent.click(item);

      expect(mockOnNavigate).toHaveBeenCalledWith('child-1');
    });

    it('calls onNavigate when pressing Enter on a child session', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const item = screen.getByTestId('sub-agent-tree-item');
      fireEvent.keyDown(item, { key: 'Enter' });

      expect(mockOnNavigate).toHaveBeenCalledWith('child-1');
    });

    it('calls onNavigate when pressing Space on a child session', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const item = screen.getByTestId('sub-agent-tree-item');
      fireEvent.keyDown(item, { key: ' ' });

      expect(mockOnNavigate).toHaveBeenCalledWith('child-1');
    });
  });

  describe('nested children', () => {
    it('renders nested children correctly', () => {
      const grandchild = createMockSessionNode(
        createMockSessionInfo('grandchild-1', '@explore subagent: Check dependencies')
      );
      const child = createMockSessionNode(
        createMockSessionInfo('child-1', '@task subagent: Refactor service', defaultSessionId),
        [grandchild]
      );

      renderTree({ childSessions: [child] });

      expect(screen.getByText('Refactor service')).toBeInTheDocument();
      expect(screen.getByText('Check dependencies')).toBeInTheDocument();
    });

    it('applies correct indentation to nested items', () => {
      const grandchild = createMockSessionNode(
        createMockSessionInfo('grandchild-1', '@explore subagent: Deep nested')
      );
      const child = createMockSessionNode(
        createMockSessionInfo('child-1', '@task subagent: Parent task', defaultSessionId),
        [grandchild]
      );

      renderTree({ childSessions: [child] });

      const items = screen.getAllByTestId('sub-agent-tree-item');
      expect(items).toHaveLength(2);

      // First item at depth 0, second at depth 1
      // paddingLeft = 16 + depth * 20
      expect(items[0]).toHaveStyle({ paddingLeft: '16px' }); // depth 0
      expect(items[1]).toHaveStyle({ paddingLeft: '36px' }); // depth 1
    });

    it('can collapse nested children', () => {
      const grandchild = createMockSessionNode(
        createMockSessionInfo('grandchild-1', '@explore subagent: Check deps')
      );
      const child = createMockSessionNode(
        createMockSessionInfo('child-1', '@task subagent: Parent task', defaultSessionId),
        [grandchild]
      );

      renderTree({ childSessions: [child] });

      // Initially expanded
      expect(screen.getByText('Check deps')).toBeInTheDocument();

      // Click collapse button on the parent child item
      const collapseButton = screen.getByRole('button', { name: 'Collapse' });
      fireEvent.click(collapseButton);

      // Grandchild should be hidden
      expect(screen.queryByText('Check deps')).not.toBeInTheDocument();
    });
  });

  describe('section collapsibility', () => {
    it('starts expanded by default', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      // Content should be visible
      expect(screen.getByText('Find files')).toBeInTheDocument();

      // Header button should indicate expanded state
      const headerButton = screen.getByRole('button', { name: /Sub-agents spawned/ });
      expect(headerButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses section when clicking header', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      // Click header to collapse
      const headerButton = screen.getByRole('button', { name: /Sub-agents spawned/ });
      fireEvent.click(headerButton);

      // Content should be hidden
      expect(screen.queryByText('Find files')).not.toBeInTheDocument();
      expect(headerButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('expands section when clicking collapsed header', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const headerButton = screen.getByRole('button', { name: /Sub-agents spawned/ });

      // Collapse first
      fireEvent.click(headerButton);
      expect(screen.queryByText('Find files')).not.toBeInTheDocument();

      // Expand again
      fireEvent.click(headerButton);
      expect(screen.getByText('Find files')).toBeInTheDocument();
      expect(headerButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles section via header button click (native keyboard support)', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const headerButton = screen.getByRole('button', { name: /Sub-agents spawned/ });

      // Native button handles Enter/Space via click - simulate with click
      // First click to collapse
      fireEvent.click(headerButton);
      expect(screen.queryByText('Find files')).not.toBeInTheDocument();

      // Second click to expand
      fireEvent.click(headerButton);
      expect(screen.getByText('Find files')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA attributes for tree structure', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      // Tree container
      expect(screen.getByRole('tree')).toHaveAttribute('aria-label', 'Sub-agent sessions');

      // Tree items
      const items = screen.getAllByRole('treeitem');
      expect(items).toHaveLength(1);
    });

    it('tree items are keyboard focusable', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const item = screen.getByRole('treeitem');
      expect(item).toHaveAttribute('tabIndex', '0');
    });

    it('header has aria-controls linking to content', () => {
      const childSessions = [
        createMockSessionNode(
          createMockSessionInfo('child-1', '@explore subagent: Find files', defaultSessionId)
        ),
      ];

      renderTree({ childSessions });

      const headerButton = screen.getByRole('button', { name: /Sub-agents spawned/ });
      const contentId = headerButton.getAttribute('aria-controls');

      expect(contentId).toBe(`sub-agents-${defaultSessionId}`);
      expect(screen.getByRole('tree')).toHaveAttribute('id', contentId);
    });
  });
});
