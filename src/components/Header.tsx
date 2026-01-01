import { Clock, Coins, Hash, FileCode, PanelLeftClose, PanelLeft } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useSessionStore } from '../store/sessionStore';
import { calculateTotals } from '../utils/calculateTotals';
import { formatCost, formatTokens, formatDuration, formatFileChanges } from '../utils/formatters';
import type { Session } from '../types/session';
import { isAssistantMessage } from '../types/session';

export function Header() {
  const { session, sidebarOpen, toggleSidebar } = useSessionStore();
  
  const totals = session ? calculateTotals(session) : null;

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 sticky top-0 z-10">
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Sidebar toggle */}
        <button
          onClick={toggleSidebar}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={sidebarOpen ? 'Close sidebar' : 'Open sidebar'}
          aria-pressed={sidebarOpen}
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          ) : (
            <PanelLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          )}
        </button>

        {/* Title */}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
            {session?.info.title || 'OpenCode Session Viewer'}
          </h1>
          {session && (
            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
              {session.info.directory}
            </p>
          )}
        </div>

        {/* Metadata badges */}
        {session && totals && (
          <div className="hidden md:flex items-center gap-3 text-sm">
            {/* Model */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              <span className="text-gray-500 dark:text-gray-400">Model:</span>
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {getModelName(session)}
              </span>
            </div>

            {/* Cost */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              <Coins className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {formatCost(totals.cost)}
              </span>
            </div>

            {/* Tokens */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              <Hash className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {formatTokens(totals.tokens.total)}
              </span>
            </div>

            {/* Duration */}
            <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {formatDuration(totals.duration.start, totals.duration.end)}
              </span>
            </div>

            {/* File changes */}
            {session.info.summary && session.info.summary.files > 0 && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md">
                <FileCode className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {formatFileChanges(session.info.summary)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Theme toggle */}
        <ThemeToggle />
      </div>

      {/* Mobile metadata row */}
      {session && totals && (
        <div className="flex md:hidden items-center gap-2 px-4 pb-3 overflow-x-auto text-xs">
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded whitespace-nowrap">
            {formatCost(totals.cost)}
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded whitespace-nowrap">
            {formatTokens(totals.tokens.total)} tokens
          </span>
          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded whitespace-nowrap">
            {formatDuration(totals.duration.start, totals.duration.end)}
          </span>
        </div>
      )}
    </header>
  );
}

function getModelName(session: Session): string {
  // Find first assistant message to get model
  for (const msg of session.messages) {
    if (isAssistantMessage(msg)) {
      return msg.info.modelID;
    }
  }
  return 'Unknown';
}
