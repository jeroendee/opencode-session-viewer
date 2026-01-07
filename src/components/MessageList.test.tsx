import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MessageList } from './MessageList';
import { useSessionStore } from '../store/sessionStore';
import type { Session } from '../types/session';

// Mock the session store
vi.mock('../store/sessionStore', async () => {
  const actual = await vi.importActual<typeof import('../store/sessionStore')>(
    '../store/sessionStore'
  );
  return {
    ...actual,
    useSessionStore: vi.fn(),
  };
});

// Mock the MessageGroup component to simplify testing
vi.mock('./MessageGroup', () => ({
  MessageGroup: ({ group }: { group: { userMessage: { info: { id: string } } } }) => (
    <div data-testid={`message-group-${group.userMessage.info.id}`}>MessageGroup</div>
  ),
}));

describe('MessageList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('empty state', () => {
    it('shows empty state message when session has no messages', () => {
      const emptySession: Session = {
        info: {
          id: 'test-session',
          version: '1.0',
          projectID: 'proj-1',
          directory: '/test',
          title: 'Test Session',
          time: { created: Date.now(), updated: Date.now() },
        },
        messages: [],
      };

      vi.mocked(useSessionStore).mockReturnValue({
        session: emptySession,
      } as ReturnType<typeof useSessionStore>);

      render(<MessageList />);

      expect(screen.getByText('This session has no displayable messages')).toBeInTheDocument();
    });

    it('shows explanation about older session format', () => {
      const emptySession: Session = {
        info: {
          id: 'test-session',
          version: '1.0',
          projectID: 'proj-1',
          directory: '/test',
          title: 'Test Session',
          time: { created: Date.now(), updated: Date.now() },
        },
        messages: [],
      };

      vi.mocked(useSessionStore).mockReturnValue({
        session: emptySession,
      } as ReturnType<typeof useSessionStore>);

      render(<MessageList />);

      expect(
        screen.getByText(/older session format|conversation content could not be loaded/i)
      ).toBeInTheDocument();
    });

    it('has accessible status role for empty state', () => {
      const emptySession: Session = {
        info: {
          id: 'test-session',
          version: '1.0',
          projectID: 'proj-1',
          directory: '/test',
          title: 'Test Session',
          time: { created: Date.now(), updated: Date.now() },
        },
        messages: [],
      };

      vi.mocked(useSessionStore).mockReturnValue({
        session: emptySession,
      } as ReturnType<typeof useSessionStore>);

      render(<MessageList />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('normal rendering', () => {
    it('returns null when session is null', () => {
      vi.mocked(useSessionStore).mockReturnValue({
        session: null,
      } as ReturnType<typeof useSessionStore>);

      const { container } = render(<MessageList />);

      expect(container).toBeEmptyDOMElement();
    });

    it('renders message groups when session has messages', () => {
      const sessionWithMessages: Session = {
        info: {
          id: 'test-session',
          version: '1.0',
          projectID: 'proj-1',
          directory: '/test',
          title: 'Test Session',
          time: { created: Date.now(), updated: Date.now() },
        },
        messages: [
          {
            info: {
              id: 'msg-1',
              sessionID: 'test-session',
              role: 'user',
              time: { created: Date.now() },
              agent: 'test',
              model: { providerID: 'openai', modelID: 'gpt-4' },
            },
            parts: [{ id: 'part-1', sessionID: 'test-session', messageID: 'msg-1', type: 'text', text: 'Hello' }],
          },
        ],
      };

      vi.mocked(useSessionStore).mockReturnValue({
        session: sessionWithMessages,
      } as ReturnType<typeof useSessionStore>);

      render(<MessageList />);

      // Should NOT show empty state
      expect(screen.queryByText('This session has no displayable messages')).not.toBeInTheDocument();
      // Should render message group
      expect(screen.getByTestId('message-group-msg-1')).toBeInTheDocument();
    });
  });
});
