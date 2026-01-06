# OpenCode Session Viewer

A web-based viewer for OpenCode and Claude Code session transcripts. Browse AI coding sessions with collapsible sections, markdown rendering, syntax highlighting, search, and keyboard navigation.

## Features

- **Multi-Source Support**: Switch between OpenCode and Claude Code transcript sources
- **Session Loading**: Load sessions from file upload, URL, or paste JSON
- **Message Browsing**: View user messages and assistant responses in a clean interface
- **Collapsible Sections**: Expand/collapse assistant responses and individual steps
- **Markdown Rendering**: Full markdown support with syntax-highlighted code blocks
- **Tool Visualization**: Icons and formatted output for tool invocations
- **Thinking/Reasoning**: Collapsible reasoning blocks with token counts
- **Search**: Filter messages by content with highlighted matches
- **Navigation**: Jump-to dropdown and message index sidebar
- **Keyboard Shortcuts**: Navigate efficiently with keyboard
- **Dark Mode**: Toggle between light and dark themes
- **Responsive**: Works on desktop, tablet, and mobile

## Usage

### Select Transcript Source

Before loading sessions, select your transcript source:

1. **OpenCode**: For sessions stored in `~/.local/share/opencode/storage/`
2. **Claude Code**: For sessions stored in `~/.claude/projects/`

The source selection persists across browser sessions.

### Load a Session

1. **File Upload**: Click "Select file" or drag and drop a `.json` file
2. **From URL**: Paste a URL to a session JSON file
3. **Paste JSON**: Paste raw session JSON directly

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus search |
| `j` | Next message |
| `k` | Previous message |
| `e` | Toggle expand/collapse |
| `?` | Show keyboard shortcuts help |
| `Esc` | Close search/help |

## Development

### Prerequisites

- Node.js 20+
- npm 10+

### Setup

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure

```
src/
├── components/          # React components
│   ├── Header.tsx       # App header with theme toggle
│   ├── SourceSelector.tsx  # Transcript source toggle (OpenCode/Claude Code)
│   ├── Sidebar.tsx      # Navigation sidebar
│   ├── LoadSession.tsx  # Session loading interface
│   ├── MessageList.tsx  # Main message display
│   ├── MessageGroup.tsx # User message + assistant response
│   ├── UserMessage.tsx  # User message display
│   ├── AssistantResponse.tsx  # Collapsible assistant response
│   ├── Step.tsx         # Individual step within response
│   ├── SearchBar.tsx    # Search input
│   ├── MessageIndex.tsx # Message list in sidebar
│   ├── JumpToDropdown.tsx  # Quick navigation
│   ├── KeyboardShortcutsHelp.tsx  # Shortcuts modal
│   └── parts/           # Part renderers
│       ├── PartRenderer.tsx   # Part type dispatcher
│       ├── TextPart.tsx       # Markdown text
│       ├── ToolPart.tsx       # Tool invocations
│       ├── ReasoningPart.tsx  # Thinking blocks
│       ├── FilePart.tsx       # File content
│       └── toolIcons.tsx      # Tool icon mapping
├── hooks/               # Custom React hooks
│   ├── useSearch.ts     # Search functionality
│   ├── useNavigation.ts # Message navigation
│   └── useKeyboardShortcuts.ts  # Keyboard handling
├── store/
│   └── sessionStore.ts  # Zustand state management
├── types/
│   └── session.ts       # TypeScript types
└── utils/               # Utility functions
    ├── groupMessages.ts # Message grouping logic
    ├── calculateTotals.ts  # Token/cost calculations
    └── formatters.ts    # Display formatters
```

## Deployment

The app is configured for GitHub Pages deployment.

### Automatic Deployment

Push to `main` branch triggers automatic deployment via GitHub Actions.

### Manual Deployment

```bash
npm run build
# Deploy dist/ folder to your hosting provider
```

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 3
- Zustand (state management)
- react-markdown + react-syntax-highlighter
- Vitest (testing)
- Lucide React (icons)

## License

MIT
