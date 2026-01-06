import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SourceSelector } from './SourceSelector';
import { useSessionStore } from '../store/sessionStore';

// Reset store before each test
const resetStore = () => {
  useSessionStore.setState({
    transcriptSource: 'opencode',
  });
};

describe('SourceSelector', () => {
  beforeEach(() => {
    resetStore();
  });

  describe('rendering', () => {
    it('renders radio buttons for OpenCode and Claude Code', () => {
      render(<SourceSelector />);

      expect(screen.getByRole('radio', { name: /opencode/i })).toBeInTheDocument();
      expect(screen.getByRole('radio', { name: /claude code/i })).toBeInTheDocument();
    });

    it('has accessible group label', () => {
      render(<SourceSelector />);

      expect(screen.getByRole('radiogroup')).toHaveAccessibleName(/source/i);
    });
  });

  describe('state display', () => {
    it('shows OpenCode selected when source is opencode', () => {
      useSessionStore.setState({ transcriptSource: 'opencode' });
      render(<SourceSelector />);

      expect(screen.getByRole('radio', { name: /opencode/i })).toBeChecked();
      expect(screen.getByRole('radio', { name: /claude code/i })).not.toBeChecked();
    });

    it('shows Claude Code selected when source is claude-code', () => {
      useSessionStore.setState({ transcriptSource: 'claude-code' });
      render(<SourceSelector />);

      expect(screen.getByRole('radio', { name: /opencode/i })).not.toBeChecked();
      expect(screen.getByRole('radio', { name: /claude code/i })).toBeChecked();
    });
  });

  describe('interactions', () => {
    it('calls setTranscriptSource with claude-code when Claude Code clicked', () => {
      const setTranscriptSource = vi.fn();
      useSessionStore.setState({
        transcriptSource: 'opencode',
        setTranscriptSource,
      });

      render(<SourceSelector />);

      fireEvent.click(screen.getByRole('radio', { name: /claude code/i }));

      expect(setTranscriptSource).toHaveBeenCalledWith('claude-code');
    });

    it('calls setTranscriptSource with opencode when OpenCode clicked', () => {
      const setTranscriptSource = vi.fn();
      useSessionStore.setState({
        transcriptSource: 'claude-code',
        setTranscriptSource,
      });

      render(<SourceSelector />);

      fireEvent.click(screen.getByRole('radio', { name: /opencode/i }));

      expect(setTranscriptSource).toHaveBeenCalledWith('opencode');
    });
  });

  describe('visual indication', () => {
    it('has visual styling difference for selected option', () => {
      useSessionStore.setState({ transcriptSource: 'opencode' });
      render(<SourceSelector />);

      const opencodeLabel = screen.getByRole('radio', { name: /opencode/i }).closest('label');
      const claudeCodeLabel = screen.getByRole('radio', { name: /claude code/i }).closest('label');

      // Active option should have distinct visual styling (blue background)
      expect(opencodeLabel).toHaveClass('bg-blue-500');
      expect(claudeCodeLabel).not.toHaveClass('bg-blue-500');
    });
  });
});
