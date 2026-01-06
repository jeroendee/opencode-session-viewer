import { describe, it, expect, afterEach } from 'vitest';
import { generateSessionHtml, collectExportState, escapeHtml, type ExportOptions } from './exportHtml';
import type { Session, UserMessage, AssistantMessage, TextPart, ToolPart, ReasoningPart } from '../types/session';

/**
 * Creates a minimal valid session for testing.
 */
function createTestSession(overrides?: Partial<Session>): Session {
  return {
    info: {
      id: 'test-session-123',
      version: '1.0',
      projectID: 'test-project',
      directory: '/test/project',
      title: 'Test Session',
      time: {
        created: 1704067200000, // Jan 1, 2024
        updated: 1704070800000, // Jan 1, 2024 + 1 hour
      },
    },
    messages: [],
    ...overrides,
  };
}

/**
 * Creates a test user message.
 */
function createUserMessage(text: string, id = 'user-msg-1'): UserMessage {
  const textPart: TextPart = {
    id: `${id}-part`,
    sessionID: 'test-session-123',
    messageID: id,
    type: 'text',
    text,
  };
  return {
    info: {
      id,
      sessionID: 'test-session-123',
      role: 'user',
      time: { created: 1704067200000 },
      agent: 'default',
      model: { providerID: 'anthropic', modelID: 'claude-3' },
    },
    parts: [textPart],
  };
}

/**
 * Creates a test assistant message.
 */
function createAssistantMessage(parentId: string, id = 'assistant-msg-1', parts: (TextPart | ToolPart | ReasoningPart)[] = []): AssistantMessage {
  return {
    info: {
      id,
      sessionID: 'test-session-123',
      role: 'assistant',
      parentID: parentId,
      time: { created: 1704067300000, completed: 1704067400000 },
      modelID: 'claude-3-5-sonnet',
      providerID: 'anthropic',
      agent: 'default',
      mode: 'normal',
      path: { cwd: '/test', root: '/test' },
      cost: 0.01,
      tokens: {
        input: 1000,
        output: 500,
        reasoning: 0,
        cache: { read: 0, write: 0 },
      },
    },
    parts,
  };
}

/**
 * Creates a test text part.
 */
function createTextPart(text: string, messageId: string): TextPart {
  return {
    id: `${messageId}-text-part`,
    sessionID: 'test-session-123',
    messageID: messageId,
    type: 'text',
    text,
  };
}

/**
 * Creates a test tool part.
 */
function createToolPart(toolName: string, messageId: string, completed = true): ToolPart {
  return {
    id: `${messageId}-tool-part`,
    sessionID: 'test-session-123',
    messageID: messageId,
    type: 'tool',
    callID: 'call-123',
    tool: toolName,
    state: completed
      ? {
          status: 'completed',
          input: { test: 'input' },
          output: 'test output',
          title: 'Test Tool',
          time: { start: 1704067300000, end: 1704067350000 },
        }
      : {
          status: 'pending',
          input: { test: 'input' },
          raw: '{}',
        },
  };
}

describe('escapeHtml', () => {
  it('escapes less than sign', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater than sign', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#039;s');
  });

  it('escapes multiple special characters', () => {
    expect(escapeHtml('<div class="test">Hello & goodbye</div>')).toBe(
      '&lt;div class=&quot;test&quot;&gt;Hello &amp; goodbye&lt;/div&gt;'
    );
  });

  it('returns empty string unchanged', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('returns plain text unchanged', () => {
    expect(escapeHtml('Hello, World!')).toBe('Hello, World!');
  });
});

describe('generateSessionHtml', () => {
  const defaultOptions: ExportOptions = {
    theme: 'light',
    expandedIds: new Set(),
  };

  it('produces valid HTML structure', () => {
    const session = createTestSession();
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html lang="en"');
    expect(html).toContain('<head>');
    expect(html).toContain('</head>');
    expect(html).toContain('<body>');
    expect(html).toContain('</body>');
    expect(html).toContain('</html>');
  });

  it('includes session title in document title', () => {
    const session = createTestSession({ info: { ...createTestSession().info, title: 'My Custom Session' } });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('<title>My Custom Session</title>');
  });

  it('uses default title when session has no title', () => {
    const session = createTestSession({ info: { ...createTestSession().info, title: '' } });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('<title>OpenCode Session</title>');
  });

  it('applies dark theme class when specified', () => {
    const session = createTestSession();
    const html = generateSessionHtml(session, { ...defaultOptions, theme: 'dark' });

    expect(html).toContain('<html lang="en" class="dark">');
  });

  it('does not apply dark theme class for light theme', () => {
    const session = createTestSession();
    const html = generateSessionHtml(session, { ...defaultOptions, theme: 'light' });

    expect(html).toContain('<html lang="en" class="">');
  });

  it('includes inline styles', () => {
    const session = createTestSession();
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('<style>');
    expect(html).toContain('</style>');
    // Check for some expected CSS
    expect(html).toContain('--color-gray-');
    expect(html).toContain('.dark {');
  });

  it('includes inline scripts', () => {
    const session = createTestSession();
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('<script>');
    expect(html).toContain('</script>');
    expect(html).toContain('toggleTheme');
  });

  it('renders header with session info', () => {
    const session = createTestSession();
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('Test Session');
    expect(html).toContain('/test/project');
    expect(html).toContain('header');
  });

  it('renders user messages', () => {
    const userMessage = createUserMessage('Hello, this is my message');
    const session = createTestSession({ messages: [userMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('Hello, this is my message');
    expect(html).toContain('user-message');
    expect(html).toContain('User');
  });

  it('renders assistant responses', () => {
    const userMessage = createUserMessage('Hello');
    const textPart = createTextPart('This is my response', 'assistant-msg-1');
    const assistantMessage = createAssistantMessage('user-msg-1', 'assistant-msg-1', [textPart]);
    const session = createTestSession({ messages: [userMessage, assistantMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('This is my response');
    expect(html).toContain('assistant-response');
    expect(html).toContain('Assistant');
  });

  it('renders tool parts', () => {
    const userMessage = createUserMessage('Run a command');
    const toolPart = createToolPart('bash', 'assistant-msg-1');
    const assistantMessage = createAssistantMessage('user-msg-1', 'assistant-msg-1', [toolPart]);
    const session = createTestSession({ messages: [userMessage, assistantMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('bash');
    expect(html).toContain('tool-chip');
    expect(html).toContain('Test Tool');
  });

  it('applies task styling to task tools', () => {
    const userMessage = createUserMessage('Run a task');
    const toolPart = createToolPart('task', 'assistant-msg-1');
    const assistantMessage = createAssistantMessage('user-msg-1', 'assistant-msg-1', [toolPart]);
    const session = createTestSession({ messages: [userMessage, assistantMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('tool-task');
  });

  it('applies skill styling to skill tools', () => {
    const userMessage = createUserMessage('Use a skill');
    const toolPart = createToolPart('skill', 'assistant-msg-1');
    const assistantMessage = createAssistantMessage('user-msg-1', 'assistant-msg-1', [toolPart]);
    const session = createTestSession({ messages: [userMessage, assistantMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('tool-skill');
  });

  it('renders message index sidebar', () => {
    const userMessage = createUserMessage('First message');
    const session = createTestSession({ messages: [userMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('sidebar');
    expect(html).toContain('Messages');
    expect(html).toContain('data-scroll-to');
  });

  it('escapes HTML in user content', () => {
    const userMessage = createUserMessage('<script>alert("xss")</script>');
    const session = createTestSession({ messages: [userMessage] });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert');
  });

  it('escapes HTML in session title', () => {
    const session = createTestSession({
      info: { ...createTestSession().info, title: '<img onerror="alert(1)">' },
    });
    const html = generateSessionHtml(session, defaultOptions);

    expect(html).toContain('&lt;img onerror=');
    expect(html).not.toContain('<img onerror');
  });

  it('respects expanded state for assistant responses', () => {
    const userMessage = createUserMessage('Hello');
    const textPart = createTextPart('Response', 'assistant-msg-1');
    const assistantMessage = createAssistantMessage('user-msg-1', 'assistant-msg-1', [textPart]);
    const session = createTestSession({ messages: [userMessage, assistantMessage] });

    // Test collapsed state (default)
    const collapsedHtml = generateSessionHtml(session, { ...defaultOptions, expandedIds: new Set() });
    expect(collapsedHtml).toContain('aria-expanded="false"');
    expect(collapsedHtml).toContain('class="assistant-content hidden"');

    // Test expanded state
    const expandedHtml = generateSessionHtml(session, {
      ...defaultOptions,
      expandedIds: new Set(['assistant-response-assistant-msg-1']),
    });
    expect(expandedHtml).toContain('aria-expanded="true"');
    expect(expandedHtml).toContain('class="assistant-content "');
  });

  it('respects expanded state for tool parts', () => {
    const userMessage = createUserMessage('Run command');
    const toolPart = createToolPart('bash', 'assistant-msg-1');
    const assistantMessage = createAssistantMessage('user-msg-1', 'assistant-msg-1', [toolPart]);
    const session = createTestSession({ messages: [userMessage, assistantMessage] });

    // Test collapsed state (default)
    const collapsedHtml = generateSessionHtml(session, { ...defaultOptions, expandedIds: new Set() });
    expect(collapsedHtml).toMatch(/tool-details.*hidden/);

    // Test expanded state
    const expandedHtml = generateSessionHtml(session, {
      ...defaultOptions,
      expandedIds: new Set(['tool-assistant-msg-1-tool-part']),
    });
    expect(expandedHtml).toMatch(/tool-details tool-default\s*"/);
  });
});

describe('collectExportState', () => {
  afterEach(() => {
    // Restore any document modifications
    document.documentElement.classList.remove('dark');
  });

  it('returns light theme when document does not have dark class', () => {
    document.documentElement.classList.remove('dark');
    const state = collectExportState();
    expect(state.theme).toBe('light');
  });

  it('returns dark theme when document has dark class', () => {
    document.documentElement.classList.add('dark');
    const state = collectExportState();
    expect(state.theme).toBe('dark');
  });

  it('returns empty expandedIds when no elements are expanded', () => {
    const state = collectExportState();
    expect(state.expandedIds.size).toBe(0);
  });

  it('collects aria-controls from expanded elements', () => {
    // Create a test element with aria-expanded="true"
    const button = document.createElement('button');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('aria-controls', 'test-content-1');
    document.body.appendChild(button);

    try {
      const state = collectExportState();
      expect(state.expandedIds.has('test-content-1')).toBe(true);
    } finally {
      document.body.removeChild(button);
    }
  });

  it('collects data-toggle from expanded elements', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-expanded', 'true');
    button.setAttribute('data-toggle', 'test-toggle-1');
    document.body.appendChild(button);

    try {
      const state = collectExportState();
      expect(state.expandedIds.has('test-toggle-1')).toBe(true);
    } finally {
      document.body.removeChild(button);
    }
  });
});
