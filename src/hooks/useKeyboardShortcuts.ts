import { useEffect, useCallback, useState } from 'react';

interface KeyboardShortcutsConfig {
  onFocusSearch: () => void;
  onNextMessage: () => void;
  onPrevMessage: () => void;
  onToggleCollapse: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onFocusSearch,
  onNextMessage,
  onPrevMessage,
  onToggleCollapse,
  enabled = true,
}: KeyboardShortcutsConfig) {
  const [showHelp, setShowHelp] = useState(false);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input/textarea
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // But still allow Escape in inputs
      if (e.key === 'Escape') {
        (target as HTMLInputElement).blur();
      }
      return;
    }

    // Ignore if modifier keys are pressed (except for Ctrl+K)
    const hasModifier = e.metaKey || e.altKey;
    const isCtrlK = e.ctrlKey && e.key === 'k';
    
    if (hasModifier || (e.ctrlKey && !isCtrlK)) {
      return;
    }

    switch (e.key) {
      case '/':
        e.preventDefault();
        onFocusSearch();
        break;
      case 'k':
        if (e.ctrlKey) {
          e.preventDefault();
          onFocusSearch();
        } else {
          // Navigate to previous message
          onPrevMessage();
        }
        break;
      case 'j':
        // Navigate to next message
        onNextMessage();
        break;
      case 'e':
        // Toggle collapse
        onToggleCollapse();
        break;
      case '?':
        // Show help
        setShowHelp(prev => !prev);
        break;
      case 'Escape':
        // Close help if open
        if (showHelp) {
          setShowHelp(false);
        }
        break;
    }
  }, [onFocusSearch, onNextMessage, onPrevMessage, onToggleCollapse, showHelp]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);

  return {
    showHelp,
    setShowHelp,
  };
}
