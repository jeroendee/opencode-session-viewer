import { useEffect, useCallback, useState } from 'react';

interface KeyboardShortcutsConfig {
  onFocusSearch: () => void;
  onNextMessage: () => void;
  onPrevMessage: () => void;
  onToggleCollapse: () => void;
  onOpenFolder?: () => void;
  onToggleSidebar?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onFocusSearch,
  onNextMessage,
  onPrevMessage,
  onToggleCollapse,
  onOpenFolder,
  onToggleSidebar,
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

    // Handle Ctrl/Cmd shortcuts
    const isMod = e.ctrlKey || e.metaKey;
    
    if (isMod) {
      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          onFocusSearch();
          return;
        case 'o':
          e.preventDefault();
          onOpenFolder?.();
          return;
        case '\\':
          e.preventDefault();
          onToggleSidebar?.();
          return;
      }
      return;
    }

    // Ignore other modifier combinations
    if (e.altKey) {
      return;
    }

    switch (e.key) {
      case '/':
        e.preventDefault();
        onFocusSearch();
        break;
      case 'k':
        // Navigate to previous message
        onPrevMessage();
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
  }, [onFocusSearch, onNextMessage, onPrevMessage, onToggleCollapse, onOpenFolder, onToggleSidebar, showHelp]);

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
