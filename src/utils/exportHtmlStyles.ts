/**
 * CSS styles for exported HTML documents.
 * Returns a complete stylesheet as a string that includes:
 * - CSS variables for light/dark themes (matching Tailwind gray, blue, green, amber, teal, etc.)
 * - `.dark` class for dark mode
 * - Layout styles (flexbox for header, sidebar + main content)
 * - Typography (font-family, sizes, prose-like for content)
 * - Component styles matching the current UI
 * - Highlight animations
 * - Scrollbar styling
 * - Responsive breakpoints for mobile
 */
export function getExportStyles(): string {
  return `
/* CSS Variables for theming */
:root {
  /* Gray scale (light mode) */
  --color-gray-50: #f9fafb;
  --color-gray-100: #f3f4f6;
  --color-gray-200: #e5e7eb;
  --color-gray-300: #d1d5db;
  --color-gray-400: #9ca3af;
  --color-gray-500: #6b7280;
  --color-gray-600: #4b5563;
  --color-gray-700: #374151;
  --color-gray-800: #1f2937;
  --color-gray-900: #111827;
  
  /* Blue */
  --color-blue-50: #eff6ff;
  --color-blue-100: #dbeafe;
  --color-blue-200: #bfdbfe;
  --color-blue-400: #60a5fa;
  --color-blue-500: #3b82f6;
  --color-blue-600: #2563eb;
  --color-blue-700: #1d4ed8;
  --color-blue-800: #1e40af;
  --color-blue-900: #1e3a8a;
  
  /* Green */
  --color-green-100: #dcfce7;
  --color-green-400: #4ade80;
  --color-green-600: #16a34a;
  --color-green-800: #166534;
  
  /* Amber */
  --color-amber-50: #fffbeb;
  --color-amber-100: #fef3c7;
  --color-amber-200: #fde68a;
  --color-amber-300: #fcd34d;
  --color-amber-400: #fbbf24;
  --color-amber-500: #f59e0b;
  --color-amber-700: #b45309;
  --color-amber-800: #92400e;
  
  /* Teal */
  --color-teal-50: #f0fdfa;
  --color-teal-100: #ccfbf1;
  --color-teal-200: #99f6e4;
  --color-teal-400: #2dd4bf;
  --color-teal-500: #14b8a6;
  --color-teal-700: #0f766e;
  --color-teal-800: #115e59;
  
  /* Purple */
  --color-purple-50: #faf5ff;
  --color-purple-100: #f3e8ff;
  --color-purple-400: #c084fc;
  --color-purple-500: #a855f7;
  --color-purple-700: #7e22ce;
  --color-purple-800: #6b21a8;
  
  /* Red */
  --color-red-50: #fef2f2;
  --color-red-400: #f87171;
  --color-red-500: #ef4444;
  --color-red-600: #dc2626;
  --color-red-700: #b91c1c;
  
  /* Pink */
  --color-pink-400: #f472b6;
  --color-pink-600: #db2777;
  
  /* Yellow */
  --color-yellow-50: #fefce8;
  --color-yellow-400: #facc15;
  
  /* Semantic colors (light mode) */
  --bg-primary: white;
  --bg-secondary: var(--color-gray-50);
  --bg-tertiary: var(--color-gray-100);
  --text-primary: var(--color-gray-900);
  --text-secondary: var(--color-gray-700);
  --text-tertiary: var(--color-gray-500);
  --text-muted: var(--color-gray-400);
  --border-primary: var(--color-gray-200);
  --border-secondary: var(--color-gray-100);
}

.dark {
  color-scheme: dark;
  
  --bg-primary: var(--color-gray-800);
  --bg-secondary: var(--color-gray-900);
  --bg-tertiary: var(--color-gray-700);
  --text-primary: white;
  --text-secondary: var(--color-gray-200);
  --text-tertiary: var(--color-gray-400);
  --text-muted: var(--color-gray-500);
  --border-primary: var(--color-gray-700);
  --border-secondary: var(--color-gray-600);
}

/* Reset and base styles */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 16px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  padding: 0;
  background: var(--bg-secondary);
  color: var(--text-primary);
  min-height: 100vh;
}

/* Layout */
.layout {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-container {
  display: flex;
  flex: 1;
}

.content-area {
  flex: 1;
  padding: 1.5rem;
  max-width: 960px;
  margin: 0 auto;
}

/* Sidebar */
.sidebar {
  width: 280px;
  flex-shrink: 0;
  border-left: 1px solid var(--border-primary);
  background: var(--bg-primary);
  padding: 1rem;
  overflow-y: auto;
  position: sticky;
  top: 60px;
  height: calc(100vh - 60px);
}

.sidebar-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-tertiary);
  margin-bottom: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sidebar-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.sidebar-item {
  margin-bottom: 0.25rem;
}

.sidebar-link {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  text-decoration: none;
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.4;
  transition: background-color 0.15s, color 0.15s;
  cursor: pointer;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.sidebar-link:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.sidebar-link.active {
  background: var(--color-blue-100);
  color: var(--color-blue-900);
}

.dark .sidebar-link.active {
  background: rgba(59, 130, 246, 0.2);
  color: var(--color-blue-100);
}

.sidebar-number {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 0.75rem;
  color: var(--text-muted);
  flex-shrink: 0;
  margin-top: 0.125rem;
}

.sidebar-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* Header */
.header {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-primary);
  padding: 0.75rem 1rem;
  position: sticky;
  top: 0;
  z-index: 10;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.header-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
  flex: 1;
  min-width: 200px;
}

.header-subtitle {
  font-size: 0.875rem;
  color: var(--text-tertiary);
  margin: 0;
}

.header-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  background: var(--bg-tertiary);
  border-radius: 0.375rem;
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.badge-label {
  color: var(--text-tertiary);
}

.badge-value {
  font-weight: 500;
}

.badge svg {
  width: 1rem;
  height: 1rem;
  color: var(--text-muted);
}

/* Theme toggle button */
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem;
  border: none;
  background: none;
  border-radius: 0.375rem;
  cursor: pointer;
  color: var(--text-tertiary);
  transition: background-color 0.15s, color 0.15s;
}

.theme-toggle:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.theme-toggle svg {
  width: 1.25rem;
  height: 1.25rem;
}

/* Message groups */
.message-group {
  margin-bottom: 1.5rem;
}

/* User message */
.user-message {
  background: var(--color-blue-50);
  border: 1px solid var(--color-blue-100);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-bottom: 1rem;
}

.dark .user-message {
  background: rgba(59, 130, 246, 0.1);
  border-color: var(--color-blue-800);
}

.user-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.user-header-left {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.user-icon {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0.375rem;
  background: var(--color-blue-100);
  border-radius: 0.375rem;
  color: var(--color-blue-600);
}

.dark .user-icon {
  background: var(--color-blue-800);
  color: var(--color-blue-400);
}

.user-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-blue-700);
}

.dark .user-label {
  color: var(--color-blue-300);
}

.user-index {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.user-time {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.user-content {
  color: var(--color-gray-800);
  white-space: pre-wrap;
  word-break: break-word;
}

.dark .user-content {
  color: var(--color-gray-200);
}

/* Assistant response */
.assistant-response {
  background: var(--bg-primary);
  border: 1px solid var(--border-primary);
  border-radius: 0.5rem;
  overflow: hidden;
}

.assistant-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: background-color 0.15s;
  border: none;
  background: none;
  width: 100%;
  text-align: left;
}

.assistant-header:hover {
  background: var(--bg-secondary);
}

.assistant-chevron {
  color: var(--text-muted);
}

.assistant-chevron svg {
  width: 1.25rem;
  height: 1.25rem;
  transition: transform 0.15s;
}

.assistant-chevron.expanded svg {
  transform: rotate(90deg);
}

.assistant-icon {
  width: 1.75rem;
  height: 1.75rem;
  padding: 0.375rem;
  background: var(--color-green-100);
  border-radius: 0.375rem;
  color: var(--color-green-600);
}

.dark .assistant-icon {
  background: var(--color-green-800);
  color: var(--color-green-400);
}

.assistant-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-green-700);
}

.dark .assistant-label {
  color: var(--color-green-400);
}

.assistant-summary {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.assistant-stats {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-muted);
}

.assistant-content {
  border-top: 1px solid var(--border-secondary);
  padding: 1rem;
}

.assistant-content.hidden {
  display: none;
}

/* Tool parts */
.tool-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  margin: 0.5rem 0;
  cursor: pointer;
  border: none;
  text-align: left;
  transition: background-color 0.15s;
}

.tool-chip.tool-default {
  background: var(--bg-tertiary);
}

.tool-chip.tool-default:hover {
  background: var(--color-gray-200);
}

.dark .tool-chip.tool-default:hover {
  background: var(--color-gray-600);
}

.tool-chip.tool-task {
  background: var(--color-amber-50);
  border: 1px solid var(--color-amber-200);
}

.tool-chip.tool-task:hover {
  background: var(--color-amber-100);
}

.dark .tool-chip.tool-task {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--color-amber-700);
}

.dark .tool-chip.tool-task:hover {
  background: rgba(245, 158, 11, 0.2);
}

.tool-chip.tool-skill {
  background: var(--color-teal-50);
  border: 1px solid var(--color-teal-200);
}

.tool-chip.tool-skill:hover {
  background: var(--color-teal-100);
}

.dark .tool-chip.tool-skill {
  background: rgba(20, 184, 166, 0.1);
  border-color: var(--color-teal-700);
}

.dark .tool-chip.tool-skill:hover {
  background: rgba(20, 184, 166, 0.2);
}

.tool-chevron svg {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s;
}

.tool-chevron.expanded svg {
  transform: rotate(90deg);
}

.tool-chip.tool-default .tool-chevron {
  color: var(--text-muted);
}

.tool-chip.tool-task .tool-chevron {
  color: var(--color-amber-400);
}

.dark .tool-chip.tool-task .tool-chevron {
  color: var(--color-amber-500);
}

.tool-chip.tool-skill .tool-chevron {
  color: var(--color-teal-400);
}

.dark .tool-chip.tool-skill .tool-chevron {
  color: var(--color-teal-500);
}

.tool-icon svg {
  width: 1rem;
  height: 1rem;
}

.tool-chip.tool-default .tool-icon {
  color: var(--text-tertiary);
}

.tool-chip.tool-task .tool-icon {
  color: var(--color-amber-500);
}

.dark .tool-chip.tool-task .tool-icon {
  color: var(--color-amber-400);
}

.tool-chip.tool-skill .tool-icon {
  color: var(--color-teal-500);
}

.dark .tool-chip.tool-skill .tool-icon {
  color: var(--color-teal-400);
}

.tool-name {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
}

.tool-chip.tool-default .tool-name {
  color: var(--text-secondary);
}

.tool-chip.tool-task .tool-name {
  color: var(--color-amber-700);
}

.dark .tool-chip.tool-task .tool-name {
  color: var(--color-amber-300);
}

.tool-chip.tool-skill .tool-name {
  color: var(--color-teal-700);
}

.dark .tool-chip.tool-skill .tool-name {
  color: var(--color-teal-300);
}

.tool-title {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tool-chip.tool-default .tool-title {
  color: var(--text-tertiary);
}

.tool-chip.tool-task .tool-title {
  color: var(--color-amber-600);
}

.dark .tool-chip.tool-task .tool-title {
  color: var(--color-amber-400);
}

.tool-chip.tool-skill .tool-title {
  color: var(--color-teal-600);
}

.dark .tool-chip.tool-skill .tool-title {
  color: var(--color-teal-400);
}

.tool-status svg {
  width: 1rem;
  height: 1rem;
}

.tool-status-completed {
  color: var(--color-green-600);
}

.dark .tool-status-completed {
  color: var(--color-green-400);
}

.tool-status-error {
  color: var(--color-red-600);
}

.dark .tool-status-error {
  color: var(--color-red-400);
}

.tool-status-pending {
  color: var(--text-muted);
}

/* Tool details */
.tool-details {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  padding: 1rem;
  border-radius: 0.5rem;
  font-size: 0.875rem;
}

.tool-details.hidden {
  display: none;
}

.tool-details.tool-default {
  background: var(--bg-secondary);
  border: 1px solid var(--border-primary);
}

.tool-details.tool-task {
  background: var(--color-amber-50);
  border: 1px solid var(--color-amber-200);
}

.dark .tool-details.tool-task {
  background: rgba(245, 158, 11, 0.1);
  border-color: var(--color-amber-700);
}

.tool-details.tool-skill {
  background: var(--color-teal-50);
  border: 1px solid var(--color-teal-200);
}

.dark .tool-details.tool-skill {
  background: rgba(20, 184, 166, 0.1);
  border-color: var(--color-teal-700);
}

.tool-section {
  margin-bottom: 1rem;
}

.tool-section:last-child {
  margin-bottom: 0;
}

.tool-section-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 0.25rem;
}

.tool-details.tool-default .tool-section-label {
  color: var(--text-tertiary);
}

.tool-details.tool-task .tool-section-label {
  color: var(--color-amber-500);
}

.dark .tool-details.tool-task .tool-section-label {
  color: var(--color-amber-400);
}

.tool-details.tool-skill .tool-section-label {
  color: var(--color-teal-500);
}

.dark .tool-details.tool-skill .tool-section-label {
  color: var(--color-teal-400);
}

.tool-section-content {
  padding: 0.75rem;
  border-radius: 0.25rem;
  overflow-x: auto;
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 0.75rem;
  white-space: pre-wrap;
  max-height: 16rem;
  overflow-y: auto;
}

.tool-details.tool-default .tool-section-content {
  background: var(--bg-tertiary);
  color: var(--color-gray-800);
}

.dark .tool-details.tool-default .tool-section-content {
  color: var(--color-gray-200);
}

.tool-details.tool-task .tool-section-content {
  background: var(--color-amber-100);
  color: var(--color-amber-800);
}

.dark .tool-details.tool-task .tool-section-content {
  background: rgba(245, 158, 11, 0.2);
  color: var(--color-amber-200);
}

.tool-details.tool-skill .tool-section-content {
  background: var(--color-teal-100);
  color: var(--color-teal-800);
}

.dark .tool-details.tool-skill .tool-section-content {
  background: rgba(20, 184, 166, 0.2);
  color: var(--color-teal-200);
}

.tool-error .tool-section-label {
  color: var(--color-red-500);
}

.dark .tool-error .tool-section-label {
  color: var(--color-red-400);
}

.tool-error .tool-section-content {
  background: var(--color-red-50);
  color: var(--color-red-700);
}

.dark .tool-error .tool-section-content {
  background: rgba(239, 68, 68, 0.1);
  color: var(--color-red-300);
}

.tool-duration {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.tool-duration svg {
  width: 0.75rem;
  height: 0.75rem;
}

/* Reasoning/thinking part */
.reasoning-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--color-purple-50);
  margin: 0.5rem 0;
  cursor: pointer;
  border: none;
  text-align: left;
  transition: background-color 0.15s;
}

.reasoning-chip:hover {
  background: var(--color-purple-100);
}

.dark .reasoning-chip {
  background: rgba(168, 85, 247, 0.1);
}

.dark .reasoning-chip:hover {
  background: rgba(168, 85, 247, 0.2);
}

.reasoning-chevron {
  color: var(--color-purple-400);
}

.dark .reasoning-chevron {
  color: var(--color-purple-500);
}

.reasoning-chevron svg {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s;
}

.reasoning-chevron.expanded svg {
  transform: rotate(90deg);
}

.reasoning-icon {
  color: var(--color-purple-500);
}

.dark .reasoning-icon {
  color: var(--color-purple-400);
}

.reasoning-icon svg {
  width: 1rem;
  height: 1rem;
}

.reasoning-label {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-purple-700);
}

.dark .reasoning-label {
  color: var(--color-purple-300);
}

.reasoning-preview {
  font-size: 0.875rem;
  font-style: italic;
  color: var(--color-purple-500);
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .reasoning-preview {
  color: var(--color-purple-400);
}

.reasoning-content {
  margin-left: 1.5rem;
  margin-top: 0.5rem;
  padding: 1rem;
  background: var(--color-purple-50);
  border: 1px solid var(--color-purple-100);
  border-radius: 0.5rem;
}

.reasoning-content.hidden {
  display: none;
}

.dark .reasoning-content {
  background: rgba(168, 85, 247, 0.05);
  border-color: var(--color-purple-800);
}

.reasoning-text {
  font-size: 0.875rem;
  font-style: italic;
  color: var(--color-purple-700);
  white-space: pre-wrap;
  line-height: 1.6;
}

.dark .reasoning-text {
  color: var(--color-purple-300);
}

/* Text/prose content */
.prose {
  color: var(--color-gray-800);
  line-height: 1.7;
}

.dark .prose {
  color: var(--color-gray-200);
}

.prose p {
  margin-bottom: 0.5rem;
}

.prose h1 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-amber-400);
  margin-top: 1.5rem;
  margin-bottom: 0.5rem;
}

.prose h1:first-child {
  margin-top: 0;
}

.prose h2 {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-amber-400);
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}

.prose h2:first-child {
  margin-top: 0;
}

.prose h3 {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-amber-300);
  margin-top: 1rem;
  margin-bottom: 0.25rem;
}

.prose h3:first-child {
  margin-top: 0;
}

.prose h4 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-amber-300);
  margin-top: 0.75rem;
  margin-bottom: 0.25rem;
}

.prose h4:first-child {
  margin-top: 0;
}

.prose a {
  color: var(--color-blue-600);
  text-decoration: none;
}

.prose a:hover {
  text-decoration: underline;
}

.dark .prose a {
  color: var(--color-blue-400);
}

.prose blockquote {
  border-left: 4px solid var(--color-gray-300);
  padding-left: 1rem;
  font-style: italic;
  color: var(--color-gray-600);
}

.dark .prose blockquote {
  border-color: var(--color-gray-600);
  color: var(--color-gray-400);
}

.prose ul {
  list-style-type: disc;
  list-style-position: inside;
  margin: 0.5rem 0;
}

.prose ol {
  list-style-type: decimal;
  list-style-position: inside;
  margin: 0.5rem 0;
}

.prose li {
  margin-bottom: 0.25rem;
}

.prose table {
  width: 100%;
  border-collapse: collapse;
  margin: 1rem 0;
}

.prose th,
.prose td {
  border: 1px solid var(--color-gray-300);
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.dark .prose th,
.dark .prose td {
  border-color: var(--color-gray-600);
}

.prose th {
  background: var(--bg-tertiary);
  font-weight: 600;
}

/* Code styles */
.prose code {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 0.875em;
  padding: 0.125rem 0.375rem;
  background: var(--bg-tertiary);
  border-radius: 0.25rem;
  color: var(--color-pink-600);
}

.dark .prose code {
  color: var(--color-pink-400);
}

.prose pre {
  font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, monospace;
  font-size: 0.875rem;
  background: #282c34;
  color: #abb2bf;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.prose pre code {
  background: none;
  padding: 0;
  color: inherit;
}

/* Syntax highlighting (OneDark theme) */
.syntax-keyword { color: #c678dd; }
.syntax-string { color: #98c379; }
.syntax-number { color: #d19a66; }
.syntax-comment { color: #5c6370; font-style: italic; }
.syntax-function { color: #61afef; }
.syntax-class { color: #e5c07b; }
.syntax-variable { color: #e06c75; }
.syntax-operator { color: #56b6c2; }

/* Embedded session */
.embedded-session {
  margin: 1rem 0;
  border: 1px solid var(--color-blue-200);
  border-radius: 0.5rem;
  overflow: hidden;
}

.dark .embedded-session {
  border-color: var(--color-blue-800);
}

.embedded-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  background: var(--color-blue-50);
  cursor: pointer;
  border: none;
  width: 100%;
  text-align: left;
  transition: background-color 0.15s;
}

.embedded-header:hover {
  background: var(--color-blue-100);
}

.dark .embedded-header {
  background: rgba(59, 130, 246, 0.15);
}

.dark .embedded-header:hover {
  background: rgba(59, 130, 246, 0.25);
}

.embedded-chevron {
  color: var(--color-blue-500);
}

.dark .embedded-chevron {
  color: var(--color-blue-400);
}

.embedded-chevron svg {
  width: 1rem;
  height: 1rem;
  transition: transform 0.15s;
}

.embedded-chevron.expanded svg {
  transform: rotate(90deg);
}

.embedded-title {
  flex: 1;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-blue-700);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dark .embedded-title {
  color: var(--color-blue-300);
}

.embedded-content {
  padding: 0.75rem 1rem;
  background: var(--bg-primary);
  max-height: 600px;
  overflow-y: auto;
}

.dark .embedded-content {
  background: rgba(31, 41, 55, 0.5);
}

.embedded-content.hidden {
  display: none;
}

.embedded-message {
  border-left: 2px solid var(--color-blue-200);
  padding-left: 0.75rem;
  margin-bottom: 1rem;
}

.dark .embedded-message {
  border-color: var(--color-blue-700);
}

.embedded-message:last-child {
  margin-bottom: 0;
}

.embedded-user-summary {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-tertiary);
  margin-bottom: 0.5rem;
}

/* Highlight animations */
@keyframes highlight-flash {
  0% {
    box-shadow: 0 0 0 4px rgba(96, 165, 250, 0.8);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.highlight-message {
  animation: highlight-flash 2s ease-out;
}

@keyframes highlight-part-flash {
  0% {
    box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.8);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.highlight-part {
  animation: highlight-part-flash 2s ease-out;
  border-radius: 0.5rem;
}

@keyframes highlight-skill-flash {
  0% {
    box-shadow: 0 0 0 4px rgba(20, 184, 166, 0.8);
  }
  100% {
    box-shadow: 0 0 0 0 transparent;
  }
}

.highlight-skill {
  animation: highlight-skill-flash 2s ease-out;
  border-radius: 0.5rem;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--color-gray-300);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-400);
}

.dark ::-webkit-scrollbar-thumb {
  background: var(--color-gray-600);
}

.dark ::-webkit-scrollbar-thumb:hover {
  background: var(--color-gray-500);
}

/* Responsive */
@media (max-width: 1024px) {
  .sidebar {
    display: none;
  }
  
  .sidebar.mobile-open {
    display: block;
    position: fixed;
    top: 60px;
    right: 0;
    bottom: 0;
    z-index: 20;
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.1);
  }
  
  .dark .sidebar.mobile-open {
    box-shadow: -4px 0 8px rgba(0, 0, 0, 0.3);
  }
  
  .mobile-sidebar-toggle {
    display: inline-flex;
  }
  
  .sidebar-overlay {
    display: none;
  }
  
  .sidebar-overlay.open {
    display: block;
    position: fixed;
    inset: 0;
    top: 60px;
    background: rgba(0, 0, 0, 0.3);
    z-index: 15;
  }
}

@media (min-width: 1025px) {
  .mobile-sidebar-toggle {
    display: none;
  }
  
  .sidebar-overlay {
    display: none;
  }
}

@media (max-width: 640px) {
  .header-badges {
    display: none;
  }
  
  .header-title {
    font-size: 1rem;
  }
  
  .content-area {
    padding: 1rem;
  }
}

/* Utility classes */
.hidden {
  display: none !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
`.trim();
}
