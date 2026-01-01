import { useState, useEffect, useCallback } from 'react';

const MESSAGE_ID_PREFIX = 'msg-';

interface UseNavigationReturn {
  activeMessageId: string | null;
  scrollToMessage: (messageId: string) => void;
}

/**
 * Hook for managing message navigation with URL hash support.
 */
export function useNavigation(): UseNavigationReturn {
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);

  // Handle initial hash on mount and hash changes
  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.slice(1); // Remove #
      if (hash.startsWith(MESSAGE_ID_PREFIX)) {
        const messageId = hash.slice(MESSAGE_ID_PREFIX.length);
        setActiveMessageId(messageId);
        
        // Scroll to the element after a small delay for initial load
        setTimeout(() => {
          const element = document.getElementById(hash);
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Add highlight animation
            element.classList.add('highlight-message');
            setTimeout(() => {
              element.classList.remove('highlight-message');
            }, 2000);
          }
        }, 100);
      }
    }

    // Handle initial hash
    if (window.location.hash) {
      handleHashChange();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const scrollToMessage = useCallback((messageId: string) => {
    setActiveMessageId(messageId);

    // Update URL hash without triggering hashchange
    const newHash = `#${MESSAGE_ID_PREFIX}${messageId}`;
    history.pushState(null, '', newHash);

    // Scroll to the element
    const element = document.getElementById(`${MESSAGE_ID_PREFIX}${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      
      // Add highlight animation
      element.classList.add('highlight-message');
      setTimeout(() => {
        element.classList.remove('highlight-message');
      }, 2000);
    }
  }, []);

  return {
    activeMessageId,
    scrollToMessage,
  };
}
