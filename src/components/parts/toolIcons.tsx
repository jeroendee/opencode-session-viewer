import {
  Terminal,
  FileText,
  Edit,
  Search,
  Lightbulb,
  Users,
  Globe,
  Wrench,
  FolderOpen,
  BookOpen,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

/**
 * Maps tool names to appropriate Lucide icons.
 */
const toolIconMap: Record<string, LucideIcon> = {
  // Shell/terminal tools
  bash: Terminal,
  shell: Terminal,

  // File operations
  read: FileText,
  write: Edit,
  edit: Edit,

  // Search tools
  glob: FolderOpen,
  grep: Search,

  // Knowledge tools
  skill: Lightbulb,

  // Agent tools
  task: Users,

  // Web tools
  webfetch: Globe,

  // Documentation
  todowrite: BookOpen,
  todoread: BookOpen,

  // Browser/DevTools tools (chrome-devtools_xxx)
  'chrome-devtools': Globe,
};

interface ToolIconProps {
  toolName: string;
  className?: string;
}

/**
 * Normalizes a tool name for icon lookup.
 * Handles prefixes like "chrome-devtools_click" -> tries "chrome-devtools", then "click".
 */
function normalizeToolName(toolName: string): string {
  const lowerName = toolName.toLowerCase();
  
  // First try the exact name
  if (toolIconMap[lowerName]) {
    return lowerName;
  }
  
  // Handle underscore-prefixed tools (e.g., "chrome-devtools_click")
  if (lowerName.includes('_')) {
    const prefix = lowerName.split('_')[0];
    if (toolIconMap[prefix]) {
      return prefix;
    }
  }
  
  return lowerName;
}

/**
 * Returns the appropriate icon component for a tool name.
 * Falls back to Wrench icon for unknown tools.
 */
export function ToolIcon({ toolName, className = 'w-4 h-4' }: ToolIconProps) {
  const normalizedName = normalizeToolName(toolName);
  const IconComponent = toolIconMap[normalizedName] || Wrench;
  return <IconComponent className={className} />;
}
