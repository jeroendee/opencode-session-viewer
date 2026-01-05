import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CopyableSessionId } from './CopyableSessionId';

describe('CopyableSessionId', () => {
  const mockWriteText = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: mockWriteText },
      writable: true,
    });
    mockWriteText.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it('renders the session ID', () => {
    render(<CopyableSessionId sessionId="session-123-abc" />);
    expect(screen.getByText('session-123-abc')).toBeInTheDocument();
  });

  it('has accessible button with aria-label', () => {
    render(<CopyableSessionId sessionId="session-123-abc" />);
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute('aria-label', 'Copy session ID: session-123-abc');
  });

  it('copies session ID to clipboard when clicked', async () => {
    render(<CopyableSessionId sessionId="session-123-abc" />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockWriteText).toHaveBeenCalledWith('session-123-abc');
  });

  it('updates aria-label after copying', async () => {
    render(<CopyableSessionId sessionId="session-123-abc" />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute('aria-label', 'Session ID copied to clipboard');
  });

  it('updates title to "Copied!" after clicking', async () => {
    render(<CopyableSessionId sessionId="session-123-abc" />);
    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('title', 'Click to copy session ID');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute('title', 'Copied!');
  });

  it('resets state after timeout', async () => {
    render(<CopyableSessionId sessionId="session-123-abc" />);
    const button = screen.getByRole('button');

    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).toHaveAttribute('title', 'Copied!');

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(button).toHaveAttribute('title', 'Click to copy session ID');
  });

  it('applies custom className', () => {
    render(<CopyableSessionId sessionId="test-id" className="custom-class" />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
  });
});
