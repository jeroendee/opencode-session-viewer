import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseCopyToClipboardResult {
  copied: boolean;
  error: Error | null;
  copy: (text: string) => Promise<boolean>;
}

/**
 * Hook for copying text to clipboard with visual feedback state.
 * Returns a copied state that auto-resets after the specified timeout,
 * and an error state if the copy operation fails.
 */
export function useCopyToClipboard(resetTimeout = 2000): UseCopyToClipboardResult {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const copy = useCallback(async (text: string): Promise<boolean> => {
    // Clear any pending timeout from previous copy
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    setError(null);
    
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      timeoutRef.current = setTimeout(() => {
        setCopied(false);
        timeoutRef.current = null;
      }, resetTimeout);
      return true;
    } catch (err) {
      const copyError = err instanceof Error ? err : new Error('Failed to copy to clipboard');
      setError(copyError);
      setCopied(false);
      return false;
    }
  }, [resetTimeout]);

  return { copied, error, copy };
}
