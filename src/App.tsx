import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoadSession } from './components/LoadSession';
import { MessageList } from './components/MessageList';
import { useSessionStore } from './store/sessionStore';

function App() {
  const { session, sidebarOpen } = useSessionStore();

  const handleMessageClick = (messageId: string) => {
    const element = document.getElementById(`msg-${messageId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <Header />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - only show when session is loaded */}
        {session && sidebarOpen && (
          <Sidebar onMessageClick={handleMessageClick} />
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
