import { useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar, type SidebarHandle } from './components/Sidebar';
import { LoadSession } from './components/LoadSession';
import { MessageList } from './components/MessageList';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { useSessionStore } from './store/sessionStore';
import { useNavigation } from './hooks/useNavigation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { groupMessages } from './utils/groupMessages';

function App() {
  const { session, setSidebarOpen } = useSessionStore();
  const { activeMessageId, scrollToMessage } = useNavigation();
  const sidebarRef = useRef<SidebarHandle>(null);

  const groups = useMemo(() => {
    return session ? groupMessages(session.messages) : [];
  }, [session]);

  const currentIndex = useMemo(() => {
    if (!activeMessageId || groups.length === 0) return -1;
    return groups.findIndex(g => g.userMessage.info.id === activeMessageId);
  }, [groups, activeMessageId]);

  const handleFocusSearch = useCallback(() => {
    setSidebarOpen(true);
    // Small delay to ensure sidebar is open before focusing
    setTimeout(() => {
      sidebarRef.current?.focusSearch();
    }, 50);
  }, [setSidebarOpen]);

  const handleNextMessage = useCallback(() => {
    if (groups.length === 0) return;
    const nextIndex = currentIndex < groups.length - 1 ? currentIndex + 1 : 0;
    scrollToMessage(groups[nextIndex].userMessage.info.id);
  }, [groups, currentIndex, scrollToMessage]);

  const handlePrevMessage = useCallback(() => {
    if (groups.length === 0) return;
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : groups.length - 1;
    scrollToMessage(groups[prevIndex].userMessage.info.id);
  }, [groups, currentIndex, scrollToMessage]);

  const handleToggleCollapse = useCallback(() => {
    // Toggle collapse on the currently active message group
    if (!activeMessageId) return;
    // Dispatch a custom event that MessageGroup can listen to
    window.dispatchEvent(new CustomEvent('toggle-collapse', { detail: { messageId: activeMessageId } }));
  }, [activeMessageId]);

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onFocusSearch: handleFocusSearch,
    onNextMessage: handleNextMessage,
    onPrevMessage: handlePrevMessage,
    onToggleCollapse: handleToggleCollapse,
    enabled: !!session,
  });

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar - only show when session is loaded */}
        {session && (
          <Sidebar
            ref={sidebarRef}
            activeMessageId={activeMessageId}
            onMessageClick={scrollToMessage}
          />
        )}

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {session ? (
            <MessageList />
          ) : (
            <LoadSession />
          )}
        </main>
      </div>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
