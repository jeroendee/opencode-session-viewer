import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SubtaskPart } from './SubtaskPart';
import type { SubtaskPart as SubtaskPartType } from '../../types/session';

// Helper to create mock SubtaskPart
const createMockSubtaskPart = (
  overrides: Partial<SubtaskPartType> = {}
): SubtaskPartType => ({
  id: 'part-1',
  sessionID: 'session-1',
  messageID: 'message-1',
  type: 'subtask',
  prompt: 'Find all files related to session storage',
  description: 'Search for session files',
  agent: 'explore',
  ...overrides,
});

describe('SubtaskPart', () => {
  describe('rendering', () => {
    it('renders agent name and description', () => {
      const part = createMockSubtaskPart({
        agent: 'explore',
        description: 'Find relevant files',
      });

      render(<SubtaskPart part={part} />);

      expect(screen.getByText(/Delegated to/)).toBeInTheDocument();
      expect(screen.getByText('explore')).toBeInTheDocument();
      expect(screen.getByText('Find relevant files')).toBeInTheDocument();
    });

    it('renders agent icon container', () => {
      const part = createMockSubtaskPart({ agent: 'explore' });

      render(<SubtaskPart part={part} />);

      // Use stable testid instead of dynamic agent-based ones
      expect(screen.getByTestId('agent-icon')).toBeInTheDocument();
    });

    it('renders for code-reviewer agent', () => {
      const part = createMockSubtaskPart({ agent: 'code-reviewer' });

      render(<SubtaskPart part={part} />);

      expect(screen.getByTestId('agent-icon')).toBeInTheDocument();
      expect(screen.getByText('code-reviewer')).toBeInTheDocument();
    });

    it('renders for task agent', () => {
      const part = createMockSubtaskPart({ agent: 'task' });

      render(<SubtaskPart part={part} />);

      expect(screen.getByTestId('agent-icon')).toBeInTheDocument();
      expect(screen.getByText('task')).toBeInTheDocument();
    });

    it('renders for unknown agent types', () => {
      const part = createMockSubtaskPart({ agent: 'custom-agent' });

      render(<SubtaskPart part={part} />);

      expect(screen.getByTestId('agent-icon')).toBeInTheDocument();
      expect(screen.getByText('custom-agent')).toBeInTheDocument();
    });
  });

  describe('collapsible behavior', () => {
    it('starts collapsed by default', () => {
      const part = createMockSubtaskPart({
        prompt: 'This is the full prompt text',
      });

      render(<SubtaskPart part={part} />);

      // Prompt section should not be visible initially
      expect(screen.queryByText('Prompt')).not.toBeInTheDocument();
      expect(screen.queryByText('This is the full prompt text')).not.toBeInTheDocument();
    });

    it('shows full prompt when expanded', () => {
      const part = createMockSubtaskPart({
        prompt: 'Find all files related to session storage and understand the data model',
      });

      render(<SubtaskPart part={part} />);

      // Click to expand
      const button = screen.getByRole('button');
      fireEvent.click(button);

      // Prompt section should now be visible
      expect(screen.getByText('Prompt')).toBeInTheDocument();
      expect(
        screen.getByText('Find all files related to session storage and understand the data model')
      ).toBeInTheDocument();
    });

    it('collapses when clicking again', () => {
      const part = createMockSubtaskPart({
        prompt: 'Full prompt text here',
      });

      render(<SubtaskPart part={part} />);

      const button = screen.getByRole('button');

      // Expand
      fireEvent.click(button);
      expect(screen.getByText('Full prompt text here')).toBeInTheDocument();

      // Collapse
      fireEvent.click(button);
      expect(screen.queryByText('Full prompt text here')).not.toBeInTheDocument();
    });

    it('has correct aria-expanded attribute', () => {
      const part = createMockSubtaskPart();

      render(<SubtaskPart part={part} />);

      const button = screen.getByRole('button');

      // Initially collapsed
      expect(button).toHaveAttribute('aria-expanded', 'false');

      // Expand
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'true');

      // Collapse
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('command display', () => {
    it('shows command when present and expanded', () => {
      const part = createMockSubtaskPart({
        command: '/fix_next_bead',
      });

      render(<SubtaskPart part={part} />);

      // Expand
      fireEvent.click(screen.getByRole('button'));

      expect(screen.getByText(/Triggered by/)).toBeInTheDocument();
      expect(screen.getByText(/\/fix_next_bead/)).toBeInTheDocument();
    });

    it('does not show command section when command is not present', () => {
      const part = createMockSubtaskPart({
        command: undefined,
      });

      render(<SubtaskPart part={part} />);

      // Expand
      fireEvent.click(screen.getByRole('button'));

      expect(screen.queryByText(/Triggered by/)).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('has accessible button with descriptive label', () => {
      const part = createMockSubtaskPart({ agent: 'explore' });

      render(<SubtaskPart part={part} />);

      const button = screen.getByRole('button', {
        name: /subtask details for explore agent/i,
      });
      expect(button).toBeInTheDocument();
    });

    it('updates aria-label when expanded', () => {
      const part = createMockSubtaskPart({ agent: 'task' });

      render(<SubtaskPart part={part} />);

      const button = screen.getByRole('button');

      // Initially shows "Expand"
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Expand')
      );

      // After clicking shows "Collapse"
      fireEvent.click(button);
      expect(button).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Collapse')
      );
    });
  });
});
