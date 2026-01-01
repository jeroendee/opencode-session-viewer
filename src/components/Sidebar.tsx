import { X } from 'lucide-react';
import { useSessionStore } from '../store/sessionStore';
import { groupMessages, getGroupSummary } from '../utils/groupMessages';
import { truncate } from '../utils/formatters';

interface SidebarProps {
  onMessageClick?: (messageId: string) => void;
}

export function Sidebar({ onMessageClick }: SidebarProps) {
  const { session, sidebarOpen, setSidebarOpen } = useSessionStore();

  const groups = session ? groupMessages(session.messages) : [];

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

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-30
          bg-white dark:bg-gray-800
          border-r border-gray-200 dark:border-gray-700
          transform transition-all duration-200 ease-in-out
          flex flex-col
          ${sidebarOpen 
            ? 'translate-x-0 w-72' 
            : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0'}
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

        {/* Message index */}
        <nav className="flex-1 overflow-y-auto p-4">
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
            Messages ({groups.length})
          </h3>

          {groups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No session loaded
            </p>
          ) : (
            <ul className="space-y-1">
              {groups.map((group, index) => (
                <li key={group.userMessage.info.id}>
                  <button
                    onClick={() => onMessageClick?.(group.userMessage.info.id)}
                    className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500 font-mono mt-0.5">
                        {index + 1}.
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-200 group-hover:text-gray-900 dark:group-hover:text-white">
                        {truncate(getGroupSummary(group), 40)}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
      </aside>
    </>
  );
}
