/**
 * HTML Export Generator
 *
 * Generates self-contained HTML exports of sessions that can be viewed
 * offline or shared without the application.
 */

import type {
  Session,
  Part,
  TextPart,
  ReasoningPart,
  ToolPart,
  AssistantMessage,
  UserMessage,
} from '../types/session';
import {
  isAssistantMessage,
  isTextPart,
  isReasoningPart,
  isToolPart,
  isToolCompleted,
  isToolError,
} from '../types/session';
import { groupMessages, getGroupSummary, type MessageGroup } from './groupMessages';
import { calculateTotals, type SessionTotals } from './calculateTotals';
import { formatCost, formatTokens, formatDuration, formatTime, formatDurationCompact, truncate } from './formatters';
import { getExportStyles } from './exportHtmlStyles';
import { getExportScripts } from './exportHtmlScripts';

/**
 * Options for HTML export generation.
 */
export interface ExportOptions {
  /** Theme to use for the export */
  theme: 'light' | 'dark';
  /** Set of element IDs that should be expanded in the export */
  expandedIds: Set<string>;
}

/**
 * Collects the current UI state for export.
 * Call this before generateSessionHtml to capture which elements are expanded.
 * 
 * NOTE: This function requires a browser environment (document must be available).
 * For non-browser contexts, construct ExportOptions manually.
 */
export function collectExportState(): ExportOptions {
  // Guard for non-browser environments
  if (typeof document === 'undefined') {
    return {
      theme: 'light',
      expandedIds: new Set<string>(),
    };
  }

  // Get current theme
  const isDark = document.documentElement.classList.contains('dark');

  // Find all expanded elements (aria-expanded="true")
  const expandedIds = new Set<string>();
  const expandedElements = document.querySelectorAll('[aria-expanded="true"]');
  expandedElements.forEach((el) => {
    // Get the ID of the content this button controls
    const controlsId = el.getAttribute('aria-controls');
    if (controlsId) {
      expandedIds.add(controlsId);
    }
    // Also check data-toggle attribute
    const toggleId = el.getAttribute('data-toggle');
    if (toggleId) {
      expandedIds.add(toggleId);
    }
  });

  return {
    theme: isDark ? 'dark' : 'light',
    expandedIds,
  };
}

/**
 * Escapes HTML special characters to prevent XSS and rendering issues.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Gets the model name from a session.
 */
function getModelName(session: Session): string {
  for (const msg of session.messages) {
    if (isAssistantMessage(msg)) {
      return msg.info.modelID;
    }
  }
  return 'Unknown';
}

/**
 * Formats tool input for display.
 */
function formatInput(input: unknown): string {
  if (typeof input === 'string') {
    return input;
  }
  try {
    return JSON.stringify(input, null, 2);
  } catch {
    return String(input);
  }
}

/**
 * Gets the style type for a tool based on its name.
 */
function getToolStyleType(toolName: string): 'task' | 'skill' | 'default' {
  switch (toolName) {
    case 'task':
      return 'task';
    case 'skill':
      return 'skill';
    default:
      return 'default';
  }
}

// SVG Icons (inline Lucide icons)
const ICONS = {
  user: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  bot: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
  chevronRight: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>',
  check: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  x: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
  loader: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>',
  clock: '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
  brain: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>',
  terminal: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
  coins: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>',
  hash: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>',
  sun: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>',
  moon: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>',
  menu: '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>',
};

/**
 * Gets the status icon HTML for a tool.
 */
function getStatusIcon(status: string): string {
  switch (status) {
    case 'completed':
      return `<span class="tool-status tool-status-completed">${ICONS.check}</span>`;
    case 'error':
      return `<span class="tool-status tool-status-error">${ICONS.x}</span>`;
    case 'running':
      return `<span class="tool-status tool-status-pending">${ICONS.loader}</span>`;
    default:
      return `<span class="tool-status tool-status-pending">${ICONS.loader}</span>`;
  }
}

/**
 * Renders the header section.
 */
function renderHeader(session: Session, totals: SessionTotals): string {
  const title = session.info.title || 'Untitled Session';
  const model = getModelName(session);
  const cost = formatCost(totals.cost);
  const tokens = formatTokens(totals.tokens.total);
  const duration = formatDuration(totals.duration.start, totals.duration.end);

  return `
<header class="header">
  <div class="header-content">
    <button class="mobile-sidebar-toggle theme-toggle" onclick="toggleMobileSidebar()" aria-label="Toggle message index">
      ${ICONS.menu}
    </button>
    <div>
      <h1 class="header-title">${escapeHtml(title)}</h1>
      <p class="header-subtitle">${escapeHtml(session.info.directory)}</p>
    </div>
    <div class="header-badges">
      <span class="badge">
        <span class="badge-label">Model:</span>
        <span class="badge-value">${escapeHtml(model)}</span>
      </span>
      <span class="badge">
        ${ICONS.coins}
        <span class="badge-value">${cost}</span>
      </span>
      <span class="badge">
        ${ICONS.hash}
        <span class="badge-value">${tokens}</span>
      </span>
      <span class="badge">
        ${ICONS.clock}
        <span class="badge-value">${duration}</span>
      </span>
    </div>
    <button class="theme-toggle" onclick="toggleTheme()" aria-label="Toggle theme">
      <span class="sun-icon" style="display: none;">${ICONS.sun}</span>
      <span class="moon-icon">${ICONS.moon}</span>
    </button>
  </div>
</header>`.trim();
}

/**
 * Renders a user message.
 */
function renderUserMessage(message: UserMessage, index: number): string {
  const textContent = message.parts
    .filter(isTextPart)
    .map((part) => (part as TextPart).text)
    .join('\n');

  const time = formatTime(message.info.time.created);

  return `
<div class="user-message">
  <div class="user-header">
    <div class="user-header-left">
      <span class="user-icon">${ICONS.user}</span>
      <span class="user-label">User</span>
      <span class="user-index">#${index + 1}</span>
    </div>
    <span class="user-time">${time}</span>
  </div>
  <div class="user-content">${escapeHtml(textContent) || '<span style="font-style: italic; color: var(--text-tertiary);">No text content</span>'}</div>
</div>`.trim();
}

/**
 * Renders a text part.
 */
function renderTextPart(part: TextPart): string {
  if (part.ignored) {
    return '';
  }

  // For now, just escape HTML and wrap in prose div
  // Future enhancement: pre-render markdown
  return `<div class="prose">${escapeHtml(part.text)}</div>`;
}

/**
 * Renders a reasoning/thinking part.
 */
function renderReasoningPart(part: ReasoningPart, isExpanded: boolean): string {
  const contentId = `reasoning-${part.id}`;
  const preview = part.text.length > 50 ? part.text.substring(0, 50).trim() + '...' : part.text;
  const expandedClass = isExpanded ? 'expanded' : '';
  const hiddenClass = isExpanded ? '' : 'hidden';

  return `
<div class="reasoning-wrapper">
  <button class="reasoning-chip" data-toggle="${contentId}" aria-expanded="${isExpanded}" aria-label="${isExpanded ? 'Collapse' : 'Expand'} thinking section">
    <span class="reasoning-chevron ${expandedClass}">${ICONS.chevronRight}</span>
    <span class="reasoning-icon">${ICONS.brain}</span>
    <span class="reasoning-label">Thinking</span>
    ${!isExpanded ? `<span class="reasoning-preview">${escapeHtml(preview)}</span>` : ''}
  </button>
  <div id="${contentId}" class="reasoning-content ${hiddenClass}">
    <pre class="reasoning-text">${escapeHtml(part.text)}</pre>
  </div>
</div>`.trim();
}

/**
 * Renders a tool part.
 */
function renderToolPart(part: ToolPart, isExpanded: boolean): string {
  const { state } = part;
  const title = isToolCompleted(state) ? state.title : undefined;
  const hasDetails = isToolCompleted(state) || isToolError(state);
  const styleType = getToolStyleType(part.tool);
  const contentId = `tool-${part.id}`;
  const expandedClass = isExpanded ? 'expanded' : '';
  const hiddenClass = isExpanded ? '' : 'hidden';

  // Calculate duration if available
  let durationHtml = '';
  if (isToolCompleted(state) || isToolError(state)) {
    const duration = state.time.end - state.time.start;
    durationHtml = `
      <div class="tool-duration">
        ${ICONS.clock}
        <span>Duration: ${formatDurationCompact(duration)}</span>
      </div>`;
  }

  // Build the chip
  const chipHtml = `
<button class="tool-chip tool-${styleType}" ${hasDetails ? `data-toggle="${contentId}" aria-expanded="${isExpanded}"` : ''} aria-label="${hasDetails ? `${isExpanded ? 'Collapse' : 'Expand'} ${part.tool} tool details` : `${part.tool} tool`}">
  ${hasDetails ? `<span class="tool-chevron ${expandedClass}">${ICONS.chevronRight}</span>` : ''}
  <span class="tool-icon">${ICONS.terminal}</span>
  <span class="tool-name">${escapeHtml(part.tool)}</span>
  ${title ? `<span class="tool-title">${escapeHtml(title)}</span>` : ''}
  ${getStatusIcon(state.status)}
</button>`.trim();

  if (!hasDetails) {
    return `<div id="part-${part.id}">${chipHtml}</div>`;
  }

  // Build the details section
  const inputSection = `
<div class="tool-section">
  <div class="tool-section-label">Input</div>
  <pre class="tool-section-content">${escapeHtml(formatInput(state.input))}</pre>
</div>`;

  let outputSection = '';
  if (isToolCompleted(state) && state.output) {
    outputSection = `
<div class="tool-section">
  <div class="tool-section-label">Output</div>
  <pre class="tool-section-content">${escapeHtml(state.output)}</pre>
</div>`;
  }

  let errorSection = '';
  if (isToolError(state)) {
    errorSection = `
<div class="tool-section tool-error">
  <div class="tool-section-label">Error</div>
  <pre class="tool-section-content">${escapeHtml(state.error)}</pre>
</div>`;
  }

  // Embedded session placeholder for task tools
  let embeddedSessionHtml = '';
  if (part.tool === 'task' && isToolCompleted(state)) {
    embeddedSessionHtml = `
<div class="embedded-session">
  <div class="embedded-header">
    <span class="embedded-chevron">${ICONS.chevronRight}</span>
    <span class="embedded-title">[Embedded session content]</span>
  </div>
</div>`;
  }

  return `
<div id="part-${part.id}">
  ${chipHtml}
  <div id="${contentId}" class="tool-details tool-${styleType} ${hiddenClass}">
    ${inputSection}
    ${outputSection}
    ${errorSection}
    ${durationHtml}
    ${embeddedSessionHtml}
  </div>
</div>`.trim();
}

/**
 * Renders a single part.
 */
function renderPart(part: Part, expandedIds: Set<string>): string {
  if (isTextPart(part)) {
    return renderTextPart(part);
  }
  if (isReasoningPart(part)) {
    const contentId = `reasoning-${part.id}`;
    return renderReasoningPart(part, expandedIds.has(contentId));
  }
  if (isToolPart(part)) {
    const contentId = `tool-${part.id}`;
    return renderToolPart(part, expandedIds.has(contentId));
  }
  // Skip other part types (step-start, step-finish, etc.)
  return '';
}

/**
 * Groups parts into steps based on step-start markers.
 */
function groupPartsIntoSteps(messages: AssistantMessage[]): { stepNumber: number; parts: Part[] }[] {
  const steps: { stepNumber: number; parts: Part[] }[] = [];
  let currentStep: Part[] = [];
  let stepNumber = 0;

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'step-start') {
        if (currentStep.length > 0) {
          steps.push({ stepNumber, parts: currentStep });
        }
        stepNumber++;
        currentStep = [];
      } else {
        if (stepNumber === 0) {
          stepNumber = 1;
        }
        currentStep.push(part);
      }
    }
  }

  if (currentStep.length > 0) {
    steps.push({ stepNumber: stepNumber || 1, parts: currentStep });
  }

  return steps;
}

/**
 * Gets assistant stats (step count, tool count, has reasoning).
 */
function getAssistantStats(messages: AssistantMessage[]): {
  stepCount: number;
  toolCount: number;
  hasReasoning: boolean;
} {
  let stepCount = 0;
  let toolCount = 0;
  let hasReasoning = false;

  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'step-start') {
        stepCount++;
      } else if (part.type === 'tool') {
        toolCount++;
      } else if (part.type === 'reasoning') {
        hasReasoning = true;
      }
    }
  }

  return { stepCount, toolCount, hasReasoning };
}

/**
 * Renders an assistant response block.
 */
function renderAssistantResponse(messages: AssistantMessage[], expandedIds: Set<string>): string {
  if (messages.length === 0) {
    return '';
  }

  const stats = getAssistantStats(messages);
  const steps = groupPartsIntoSteps(messages);
  const contentId = `assistant-response-${messages[0].info.id}`;
  const isExpanded = expandedIds.has(contentId);
  const expandedClass = isExpanded ? 'expanded' : '';
  const hiddenClass = isExpanded ? '' : 'hidden';

  // Calculate totals
  const totalTokens = messages.reduce(
    (sum, msg) => sum + msg.info.tokens.input + msg.info.tokens.output,
    0
  );
  const totalCost = messages.reduce((sum, msg) => sum + msg.info.cost, 0);

  // Build summary
  const summaryParts: string[] = [];
  if (stats.stepCount > 0) summaryParts.push(`${stats.stepCount} step${stats.stepCount !== 1 ? 's' : ''}`);
  if (stats.toolCount > 0) summaryParts.push(`${stats.toolCount} tool${stats.toolCount !== 1 ? 's' : ''}`);
  if (stats.hasReasoning) summaryParts.push('thinking');

  // Render parts
  const partsHtml = steps
    .flatMap((step) => step.parts.map((part) => renderPart(part, expandedIds)))
    .filter((html) => html.length > 0)
    .join('\n');

  return `
<div class="assistant-response">
  <button class="assistant-header" data-toggle="${contentId}" aria-expanded="${isExpanded}" aria-controls="${contentId}" aria-label="${isExpanded ? 'Collapse' : 'Expand'} assistant response">
    <span class="assistant-chevron ${expandedClass}">${ICONS.chevronRight}</span>
    <span class="assistant-icon">${ICONS.bot}</span>
    <span class="assistant-label">Assistant</span>
    ${summaryParts.length > 0 ? `<span class="assistant-summary">${summaryParts.join(', ')}</span>` : ''}
    <span class="assistant-stats">${formatTokens(totalTokens)} tokens${totalCost > 0 ? ` / ${formatCost(totalCost)}` : ''}</span>
  </button>
  <div id="${contentId}" class="assistant-content ${hiddenClass}">
    ${partsHtml || '<p style="color: var(--text-tertiary); font-style: italic;">No content</p>'}
  </div>
</div>`.trim();
}

/**
 * Renders a message group (user message + assistant responses).
 */
function renderMessageGroup(group: MessageGroup, index: number, expandedIds: Set<string>): string {
  const messageId = group.userMessage.info.id;

  return `
<div id="msg-${messageId}" class="message-group">
  ${renderUserMessage(group.userMessage, index)}
  ${group.assistantMessages.length > 0 ? renderAssistantResponse(group.assistantMessages, expandedIds) : ''}
</div>`.trim();
}

/**
 * Renders the message index sidebar.
 */
function renderMessageIndex(groups: MessageGroup[]): string {
  if (groups.length === 0) {
    return `
<aside class="sidebar">
  <h2 class="sidebar-title">Messages</h2>
  <p style="font-size: 0.875rem; color: var(--text-tertiary);">No messages loaded</p>
</aside>`.trim();
  }

  const itemsHtml = groups
    .map((group, index) => {
      const messageId = group.userMessage.info.id;
      const summary = truncate(getGroupSummary(group), 40);

      return `
<li class="sidebar-item">
  <button class="sidebar-link" data-scroll-to="msg-${messageId}">
    <span class="sidebar-number">${index + 1}.</span>
    <span class="sidebar-text">${escapeHtml(summary)}</span>
  </button>
</li>`.trim();
    })
    .join('\n');

  return `
<aside class="sidebar">
  <h2 class="sidebar-title">Messages</h2>
  <nav aria-label="Message navigation">
    <ul class="sidebar-list">
      ${itemsHtml}
    </ul>
  </nav>
</aside>`.trim();
}

/**
 * Generates a complete HTML document for a session.
 */
export function generateSessionHtml(session: Session, options: ExportOptions): string {
  const groups = groupMessages(session.messages);
  const totals = calculateTotals(session);
  const themeClass = options.theme === 'dark' ? 'dark' : '';

  // Render all message groups
  const messagesHtml = groups
    .map((group, index) => renderMessageGroup(group, index, options.expandedIds))
    .join('\n');

  // Render sidebar
  const sidebarHtml = renderMessageIndex(groups);

  // Generate complete HTML
  return `<!DOCTYPE html>
<html lang="en" class="${themeClass}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(session.info.title || 'OpenCode Session')}</title>
  <style>
${getExportStyles()}
  </style>
</head>
<body>
  <div class="layout">
    ${renderHeader(session, totals)}
    <div class="main-container">
      <main class="content-area">
        ${messagesHtml}
      </main>
      ${sidebarHtml}
    </div>
    <div class="sidebar-overlay"></div>
  </div>
  <script>
${getExportScripts()}
  </script>
</body>
</html>`;
}
