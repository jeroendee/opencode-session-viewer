import { useMemo, useRef, useImperativeHandle, forwardRef } from 'react';
import { X } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { groupMessages } from '../utils/groupMessages';
import { useSearch } from '../hooks/useSearch';
import { SearchBar } from './SearchBar';
import { MessageIndex } from './MessageIndex';
import { JumpToDropdown } from './JumpToDropdown';

interface MessageSidebarProps {
  activeMessageId: string | null;
  onMessageClick: (messageId: string) => void;
}

export interface MessageSidebarHandle {
  focusSearch: () => void;
}

export const MessageSidebar = forwardRef<MessageSidebarHandle, MessageSidebarProps>(function MessageSidebar({ activeMessageId, onMessageClick }, ref) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useImperativeHandle(ref, () => ({
    focusSearch: () => {
      searchInputRef.current?.focus();
    },
  }));
  const { session, sidebarOpen, setSidebarOpen } = useSessionStore();

  const groups = useMemo(() => {
    return session ? groupMessages(session.messages) : [];
  }, [session]);

  const {
    searchQuery,
    searchResults,
    matchedMessageIds,
    setSearchQuery,
    clearSearch,
  } = useSearch(session);

  // Find current index for JumpToDropdown
  const currentIndex = useMemo(() => {
    if (!activeMessageId) return -1;
    return groups.findIndex(g => g.userMessage.info.id === activeMessageId);
  }, [groups, activeMessageId]);

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - positioned on the right */}
      <aside
        className={`
          fixed md:relative inset-y-0 right-0 z-30
          bg-white dark:bg-gray-800
          border-l border-gray-200 dark:border-gray-700
          transform transition-all duration-200 ease-in-out
          flex flex-col h-full
          ${sidebarOpen 
            ? 'translate-x-0 w-72' 
            : 'translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-l-0'}
        `}
      >
        {/* Mobile header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 md:hidden">
          <h2 className="font-semibold text-gray-900 dark:text-white">Messages</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Search and Jump To */}
        {session && (
          <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
            <SearchBar
              ref={searchInputRef}
              value={searchQuery}
              onChange={setSearchQuery}
              onClear={clearSearch}
              resultCount={searchResults.length}
            />
            <JumpToDropdown
              groups={groups}
              currentIndex={currentIndex}
              onSelect={onMessageClick}
            />
          </div>
        )}

        {/* Message index */}
        <div className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Messages ({groups.length})
          </h3>

          <MessageIndex
            groups={groups}
            activeMessageId={activeMessageId}
            matchedMessageIds={matchedMessageIds}
            onMessageClick={onMessageClick}
          />
        </div>
      </aside>
    </>
  );
});
