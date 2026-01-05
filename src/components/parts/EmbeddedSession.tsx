import { useState, useEffect, useCallback } from 'react';
import { ChevronDown, ChevronRight, Loader2, AlertCircle, ExternalLink } from 'lucide-react';
import type { Session, SessionInfo } from '../../types/session';
import { useSessionNavigation } from '../../contexts/SessionNavigationContext';
import { groupMessages } from '../../utils/groupMessages';
import { PartRenderer } from './PartRenderer';

interface EmbeddedSessionProps {
  /** Session info for the session to embed */
  sessionInfo: SessionInfo;
}

/**
 * Renders an embedded view of a session's messages.
 * Loads the session content on demand and displays messages inline.
 */
export function EmbeddedSession({ sessionInfo }: EmbeddedSessionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionNav = useSessionNavigation();

  // Load session when expanded
  const loadSession = useCallback(async () => {
    if (!sessionNav || session) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const loaded = await sessionNav.loadSession(sessionInfo.id);
      setSession(loaded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  }, [sessionNav, sessionInfo.id, session]);

  // Load when first expanded
  useEffect(() => {
    if (isExpanded && !session && !isLoading) {
      loadSession();
    }
  }, [isExpanded, session, isLoading, loadSession]);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleNavigate = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sessionNav) {
      sessionNav.navigateToSession(sessionInfo.id);
    }
  };

  const groups = session ? groupMessages(session.messages) : [];

  return (
    <div className="my-4 border border-blue-200 dark:border-blue-800 rounded-lg overflow-hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="
          w-full flex items-center gap-2 px-4 py-3
          bg-blue-50 dark:bg-blue-900/30
          hover:bg-blue-100 dark:hover:bg-blue-900/50
          transition-colors text-left
        "
        aria-expanded={isExpanded}
      >
        <span className="text-blue-500 dark:text-blue-400">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </span>
        
        <span className="flex-1 text-sm font-medium text-blue-700 dark:text-blue-300 truncate">
          Sub-agent Session: {sessionInfo.title}
        </span>

        {isLoading && (
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
        )}

        <button
          onClick={handleNavigate}
          className="
            p-1 rounded hover:bg-blue-200 dark:hover:bg-blue-800
            text-blue-600 dark:text-blue-400
          "
          aria-label="Open session in full view"
          title="Open in full view"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 py-3 bg-white dark:bg-gray-800/50 max-h-[600px] overflow-y-auto">
          {error ? (
            <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">{error}</span>
            </div>
          ) : isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
              <span className="ml-2 text-sm text-gray-500">Loading session...</span>
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-4">
              No messages in this session
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.userMessage.info.id} className="border-l-2 border-blue-200 dark:border-blue-700 pl-3">
                  {/* User message summary */}
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                    User: {group.userMessage.parts
                      .filter(p => p.type === 'text')
                      .map(p => (p as { text: string }).text)
                      .join(' ')
                      .slice(0, 100)}
                    {group.userMessage.parts.some(p => p.type === 'text' && (p as { text: string }).text.length > 100) && '...'}
                  </div>
                  
                  {/* Assistant response parts */}
                  {group.assistantMessages.map((msg) => (
                    <div key={msg.info.id} className="space-y-2">
                      {msg.parts.map((part) => (
                        <PartRenderer key={part.id} part={part} />
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
