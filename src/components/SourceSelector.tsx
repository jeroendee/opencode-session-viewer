import { useSessionStore, type TranscriptSource } from '../store/sessionStore';

/**
 * SourceSelector allows users to choose between OpenCode and Claude Code transcript sources.
 * Selection persists in the Zustand store.
 */
export function SourceSelector() {
  const { transcriptSource, setTranscriptSource } = useSessionStore();

  const handleChange = (source: TranscriptSource) => {
    setTranscriptSource(source);
  };

  return (
    <div
      role="radiogroup"
      aria-label="Transcript source"
      className="flex items-center gap-2 text-xs"
    >
      <span className="text-gray-500 dark:text-gray-400">Source:</span>
      <div className="flex rounded-md border border-gray-200 dark:border-gray-600 overflow-hidden">
        <label
          className={`px-3 py-1.5 cursor-pointer transition-colors ${
            transcriptSource === 'opencode'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <input
            type="radio"
            name="transcript-source"
            value="opencode"
            checked={transcriptSource === 'opencode'}
            onChange={() => handleChange('opencode')}
            className="sr-only"
          />
          OpenCode
        </label>
        <label
          className={`px-3 py-1.5 cursor-pointer transition-colors ${
            transcriptSource === 'claude-code'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
          }`}
        >
          <input
            type="radio"
            name="transcript-source"
            value="claude-code"
            checked={transcriptSource === 'claude-code'}
            onChange={() => handleChange('claude-code')}
            className="sr-only"
          />
          Claude Code
        </label>
      </div>
    </div>
  );
}
