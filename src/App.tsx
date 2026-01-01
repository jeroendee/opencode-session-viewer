import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoadSession } from './components/LoadSession';
import { MessageList } from './components/MessageList';
import { useSessionStore } from './store/sessionStore';
import { useNavigation } from './hooks/useNavigation';

function App() {
  const { session } = useSessionStore();
  const { activeMessageId, scrollToMessage } = useNavigation();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only show when session is loaded */}
        {session && (
          <Sidebar
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
    </div>
  );
}

export default App;
