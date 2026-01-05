import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionBreadcrumb, type SessionBreadcrumbProps } from './SessionBreadcrumb';
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

describe('SessionBreadcrumb', () => {
  const mockOnNavigate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderBreadcrumb = (props: Partial<SessionBreadcrumbProps> = {}) => {
    const defaultSession = createMockSessionInfo('child-1', 'Child Session', 'parent-1');
    const defaultAllSessions: Record<string, SessionInfo> = {
      'parent-1': createMockSessionInfo('parent-1', 'Parent Session'),
      'child-1': defaultSession,
    };

    const defaultProps: SessionBreadcrumbProps = {
      currentSession: defaultSession,
      allSessions: defaultAllSessions,
      onNavigate: mockOnNavigate,
      ...props,
    };
    return render(<SessionBreadcrumb {...defaultProps} />);
  };

  describe('empty state', () => {
    it('returns null when no parentID exists', () => {
      const sessionWithoutParent = createMockSessionInfo('session-1', 'Root Session');
      const { container } = renderBreadcrumb({
        currentSession: sessionWithoutParent,
        allSessions: { 'session-1': sessionWithoutParent },
      });

      expect(container.querySelector('[data-testid="session-breadcrumb"]')).not.toBeInTheDocument();
    });
  });

  describe('rendering with parent', () => {
    it('shows parent session title when parentID exists', () => {
      renderBreadcrumb();

      expect(screen.getByText('Parent Session')).toBeInTheDocument();
      expect(screen.getByText('Child Session')).toBeInTheDocument();
    });

    it('shows the back arrow button', () => {
      renderBreadcrumb();

      expect(screen.getByTestId('breadcrumb-back-button')).toBeInTheDocument();
    });

    it('shows current session as non-clickable text', () => {
      renderBreadcrumb();

      const currentSession = screen.getByTestId('breadcrumb-current');
      expect(currentSession).toBeInTheDocument();
      expect(currentSession.tagName).toBe('SPAN');
    });

    it('handles missing title gracefully', () => {
      const childSession = createMockSessionInfo('child-1', '', 'parent-1');
      const parentSession = createMockSessionInfo('parent-1', '');

      renderBreadcrumb({
        currentSession: childSession,
        allSessions: {
          'parent-1': parentSession,
          'child-1': childSession,
        },
      });

      expect(screen.getAllByText('Untitled Session')).toHaveLength(2);
    });
  });

  describe('navigation', () => {
    it('calls onNavigate when clicking parent session', () => {
      renderBreadcrumb();

      const parentLink = screen.getByTestId('breadcrumb-ancestor-0');
      fireEvent.click(parentLink);

      expect(mockOnNavigate).toHaveBeenCalledWith('parent-1');
    });

    it('calls onNavigate when clicking back arrow', () => {
      renderBreadcrumb();

      const backButton = screen.getByTestId('breadcrumb-back-button');
      fireEvent.click(backButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('parent-1');
    });

    it('navigates via click on ancestor buttons (Enter/Space handled natively by button)', () => {
      renderBreadcrumb();

      // Buttons handle Enter/Space natively via click event
      const parentLink = screen.getByTestId('breadcrumb-ancestor-0');
      fireEvent.click(parentLink);

      expect(mockOnNavigate).toHaveBeenCalledWith('parent-1');
    });
  });

  describe('deeply nested sessions', () => {
    it('shows full chain for deeply nested sessions', () => {
      const grandparent = createMockSessionInfo('grandparent-1', 'Grandparent Session');
      const parent = createMockSessionInfo('parent-1', 'Parent Session', 'grandparent-1');
      const child = createMockSessionInfo('child-1', 'Child Session', 'parent-1');

      renderBreadcrumb({
        currentSession: child,
        allSessions: {
          'grandparent-1': grandparent,
          'parent-1': parent,
          'child-1': child,
        },
      });

      expect(screen.getByText('Grandparent Session')).toBeInTheDocument();
      expect(screen.getByText('Parent Session')).toBeInTheDocument();
      expect(screen.getByText('Child Session')).toBeInTheDocument();
    });

    it('displays ancestors in correct order (oldest first)', () => {
      const grandparent = createMockSessionInfo('grandparent-1', 'Grandparent');
      const parent = createMockSessionInfo('parent-1', 'Parent', 'grandparent-1');
      const child = createMockSessionInfo('child-1', 'Child', 'parent-1');

      renderBreadcrumb({
        currentSession: child,
        allSessions: {
          'grandparent-1': grandparent,
          'parent-1': parent,
          'child-1': child,
        },
      });

      // First ancestor should be grandparent
      const ancestor0 = screen.getByTestId('breadcrumb-ancestor-0');
      expect(ancestor0).toHaveTextContent('Grandparent');

      // Second ancestor should be parent
      const ancestor1 = screen.getByTestId('breadcrumb-ancestor-1');
      expect(ancestor1).toHaveTextContent('Parent');
    });

    it('allows navigation to any ancestor in the chain', () => {
      const grandparent = createMockSessionInfo('grandparent-1', 'Grandparent');
      const parent = createMockSessionInfo('parent-1', 'Parent', 'grandparent-1');
      const child = createMockSessionInfo('child-1', 'Child', 'parent-1');

      renderBreadcrumb({
        currentSession: child,
        allSessions: {
          'grandparent-1': grandparent,
          'parent-1': parent,
          'child-1': child,
        },
      });

      // Click grandparent
      const grandparentLink = screen.getByTestId('breadcrumb-ancestor-0');
      fireEvent.click(grandparentLink);
      expect(mockOnNavigate).toHaveBeenCalledWith('grandparent-1');

      vi.clearAllMocks();

      // Click parent
      const parentLink = screen.getByTestId('breadcrumb-ancestor-1');
      fireEvent.click(parentLink);
      expect(mockOnNavigate).toHaveBeenCalledWith('parent-1');
    });

    it('back button navigates to immediate parent (not grandparent)', () => {
      const grandparent = createMockSessionInfo('grandparent-1', 'Grandparent');
      const parent = createMockSessionInfo('parent-1', 'Parent', 'grandparent-1');
      const child = createMockSessionInfo('child-1', 'Child', 'parent-1');

      renderBreadcrumb({
        currentSession: child,
        allSessions: {
          'grandparent-1': grandparent,
          'parent-1': parent,
          'child-1': child,
        },
      });

      const backButton = screen.getByTestId('breadcrumb-back-button');
      fireEvent.click(backButton);

      expect(mockOnNavigate).toHaveBeenCalledWith('parent-1');
    });
  });

  describe('current session not clickable', () => {
    it('current session element is not a button', () => {
      renderBreadcrumb();

      const currentSession = screen.getByTestId('breadcrumb-current');
      expect(currentSession.tagName).not.toBe('BUTTON');
      expect(currentSession.tagName).not.toBe('A');
    });

    it('clicking current session does not trigger navigation', () => {
      renderBreadcrumb();

      const currentSession = screen.getByTestId('breadcrumb-current');
      fireEvent.click(currentSession);

      expect(mockOnNavigate).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('handles broken chain gracefully (missing intermediate parent)', () => {
      const grandparent = createMockSessionInfo('grandparent-1', 'Grandparent');
      // Note: parent is missing from allSessions
      const child = createMockSessionInfo('child-1', 'Child', 'parent-1');

      const { container } = renderBreadcrumb({
        currentSession: child,
        allSessions: {
          'grandparent-1': grandparent,
          'child-1': child,
        },
      });

      // Should still render (parentID exists) but chain will be empty since parent not found
      expect(container.querySelector('[data-testid="session-breadcrumb"]')).toBeInTheDocument();
      // No ancestors will be shown since parent is missing
      expect(screen.queryByTestId('breadcrumb-ancestor-0')).not.toBeInTheDocument();
    });

    it('truncates long titles', () => {
      const longTitle = 'A'.repeat(50);
      const parent = createMockSessionInfo('parent-1', longTitle);
      const child = createMockSessionInfo('child-1', 'Child', 'parent-1');

      renderBreadcrumb({
        currentSession: child,
        allSessions: {
          'parent-1': parent,
          'child-1': child,
        },
      });

      const ancestorLink = screen.getByTestId('breadcrumb-ancestor-0');
      // Should be truncated to 40 chars (39 + ellipsis)
      expect(ancestorLink.textContent).toHaveLength(40);
      expect(ancestorLink.textContent?.endsWith('\u2026')).toBe(true);
    });
  });

  describe('accessibility', () => {
    it('has correct ARIA label for navigation', () => {
      renderBreadcrumb();

      expect(screen.getByRole('navigation')).toHaveAttribute('aria-label', 'Session breadcrumb');
    });

    it('back button has accessible label', () => {
      renderBreadcrumb();

      expect(screen.getByRole('button', { name: 'Go to parent session' })).toBeInTheDocument();
    });

    it('ancestor links are buttons with accessible text', () => {
      renderBreadcrumb();

      const ancestorButton = screen.getByTestId('breadcrumb-ancestor-0');
      expect(ancestorButton.tagName).toBe('BUTTON');
    });
  });
});
