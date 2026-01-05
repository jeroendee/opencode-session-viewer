import { useRef, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { MessageSidebar, type MessageSidebarHandle } from './components/MessageSidebar';
import { SessionBrowser } from './components/SessionBrowser';
import { FolderPicker } from './components/FolderPicker';
import { SelectSessionPrompt } from './components/SelectSessionPrompt';
import { MessageList } from './components/MessageList';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { SkeletonContent } from './components/SkeletonLoader';
import { useSessionStore } from './store/sessionStore';
import { useNavigation } from './hooks/useNavigation';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { groupMessages } from './utils/groupMessages';
import { SessionNavigationProvider } from './contexts/SessionNavigationContext';

function App() {
  const { 
    fileSystem, 
    session, 
    allSessions,
    selectSession,
    sidebarOpen, 
    setSidebarOpen, 
    toggleSidebar, 
    isLoadingSession, 
    browseForFolder 
  } = useSessionStore();
  const { activeMessageId, scrollToMessage } = useNavigation();
  const messageSidebarRef = useRef<MessageSidebarHandle>(null);

  const groups = useMemo(() => {
    return session ? groupMessages(session.messages) : [];
  }, [session]);

  // Handle navigation to a session
  const handleNavigateToSession = useCallback((sessionId: string) => {
    selectSession(sessionId);
  }, [selectSession]);

  const currentIndex = useMemo(() => {
    if (!activeMessageId || groups.length === 0) return -1;
    return groups.findIndex(g => g.userMessage.info.id === activeMessageId);
  }, [groups, activeMessageId]);

  const handleFocusSearch = useCallback(() => {
    setSidebarOpen(true);
    // Small delay to ensure sidebar is open before focusing
    setTimeout(() => {
      messageSidebarRef.current?.focusSearch();
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

  const handleOpenFolder = useCallback(() => {
    // Only works when no folder is loaded - triggers folder picker via store action
    if (!fileSystem) {
      browseForFolder();
    }
  }, [fileSystem, browseForFolder]);

  const handleToggleSidebar = useCallback(() => {
    toggleSidebar();
  }, [toggleSidebar]);

  const { showHelp, setShowHelp } = useKeyboardShortcuts({
    onFocusSearch: handleFocusSearch,
    onNextMessage: handleNextMessage,
    onPrevMessage: handlePrevMessage,
    onToggleCollapse: handleToggleCollapse,
    onOpenFolder: handleOpenFolder,
    onToggleSidebar: handleToggleSidebar,
    enabled: true, // Always enabled for global shortcuts
  });

  const handleCloseSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, [setSidebarOpen]);

  // If no fileSystem, show FolderPicker to load sessions folder
  if (!fileSystem) {
    return (
      <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
        <Header />
        <FolderPicker />
        <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col overflow-hidden">
      <Header />

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar - Session Browser (always visible when folder loaded) */}
        <SessionBrowser sidebarOpen={sidebarOpen} onCloseSidebar={handleCloseSidebar} />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {isLoadingSession ? (
            <SkeletonContent />
          ) : session ? (
            <SessionNavigationProvider
              allSessions={allSessions}
              fileSystem={fileSystem}
              onNavigateToSession={handleNavigateToSession}
            >
              <MessageList />
            </SessionNavigationProvider>
          ) : (
            <SelectSessionPrompt />
          )}
        </main>

        {/* Right sidebar - Message Index (only when session loaded) */}
        {session && (
          <MessageSidebar
            ref={messageSidebarRef}
            activeMessageId={activeMessageId}
            onMessageClick={scrollToMessage}
          />
        )}
      </div>

      {/* Keyboard shortcuts help modal */}
      <KeyboardShortcutsHelp isOpen={showHelp} onClose={() => setShowHelp(false)} />
    </div>
  );
}

export default App;
