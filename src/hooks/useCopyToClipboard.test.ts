import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCopyToClipboard } from './useCopyToClipboard';

describe('useCopyToClipboard', () => {
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

  it('starts with copied as false and error as null', () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('sets copied to true after successful copy and returns true', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy('test text');
    });

    expect(mockWriteText).toHaveBeenCalledWith('test text');
    expect(result.current.copied).toBe(true);
    expect(success).toBe(true);
  });

  it('resets copied to false after default timeout', async () => {
    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(result.current.copied).toBe(false);
  });

  it('respects custom reset timeout', async () => {
    const { result } = renderHook(() => useCopyToClipboard(500));

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(499);
    });

    expect(result.current.copied).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(result.current.copied).toBe(false);
  });

  it('sets error state on clipboard API failure and returns false', async () => {
    const clipboardError = new Error('Clipboard error');
    mockWriteText.mockRejectedValue(clipboardError);

    const { result } = renderHook(() => useCopyToClipboard());

    let success: boolean | undefined;
    await act(async () => {
      success = await result.current.copy('test text');
    });

    expect(result.current.error).toBe(clipboardError);
    expect(result.current.copied).toBe(false);
    expect(success).toBe(false);
  });

  it('clears error on subsequent successful copy', async () => {
    const clipboardError = new Error('Clipboard error');
    mockWriteText.mockRejectedValueOnce(clipboardError);
    mockWriteText.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useCopyToClipboard());

    // First copy fails
    await act(async () => {
      await result.current.copy('test text');
    });
    expect(result.current.error).toBe(clipboardError);

    // Second copy succeeds
    await act(async () => {
      await result.current.copy('test text 2');
    });
    expect(result.current.error).toBeNull();
    expect(result.current.copied).toBe(true);
  });

  it('clears pending timeout on unmount', async () => {
    const { result, unmount } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.copied).toBe(true);

    // Unmount before timeout fires
    unmount();

    // Advance timers - should not cause any issues (no state update on unmounted component)
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // No assertion needed - test passes if no warning about state update on unmounted component
  });

  it('clears previous timeout when copy is called again', async () => {
    const { result } = renderHook(() => useCopyToClipboard(1000));

    // First copy
    await act(async () => {
      await result.current.copy('first');
    });
    expect(result.current.copied).toBe(true);

    // Advance 500ms
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copied).toBe(true);

    // Second copy - should reset the timer
    await act(async () => {
      await result.current.copy('second');
    });
    expect(result.current.copied).toBe(true);

    // Advance another 500ms (1000ms total from first copy, 500ms from second)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    // Should still be true because second copy reset the timer
    expect(result.current.copied).toBe(true);

    // Advance another 500ms (1000ms from second copy)
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.copied).toBe(false);
  });

  it('wraps non-Error exceptions in an Error object', async () => {
    mockWriteText.mockRejectedValue('string error');

    const { result } = renderHook(() => useCopyToClipboard());

    await act(async () => {
      await result.current.copy('test text');
    });

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe('Failed to copy to clipboard');
  });
});
