/**
 * Format a cost value as currency.
 * @example formatCost(0.0234) => "$0.0234"
 * @example formatCost(1.5) => "$1.50"
 */
export function formatCost(cost: number): string {
  if (cost === 0) {
    return '$0.00';
  }
  
  // For very small costs, show more precision
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  
  // For larger costs, show 2 decimal places
  return `$${cost.toFixed(2)}`;
}

/**
 * Format a token count with K/M suffix for large numbers.
 * @example formatTokens(1500) => "1.5k"
 * @example formatTokens(52800) => "52.8k"
 * @example formatTokens(1500000) => "1.5M"
 * @example formatTokens(500) => "500"
 */
export function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) {
    return `${(tokens / 1_000_000).toFixed(1)}M`;
  }
  if (tokens >= 1_000) {
    return `${(tokens / 1_000).toFixed(1)}k`;
  }
  return tokens.toString();
}

/**
 * Format a duration in milliseconds as a human-readable string.
 * @example formatDuration(1000, 3600000) => "59m 59s"
 * @example formatDuration(0, 7200000) => "2h 0m"
 * @example formatDuration(0, 90061000) => "1d 1h 1m"
 */
export function formatDuration(startMs: number, endMs: number): string {
  const durationMs = endMs - startMs;
  
  if (durationMs < 0) {
    return '0s';
  }

  const seconds = Math.floor(durationMs / 1000) % 60;
  const minutes = Math.floor(durationMs / (1000 * 60)) % 60;
  const hours = Math.floor(durationMs / (1000 * 60 * 60)) % 24;
  const days = Math.floor(durationMs / (1000 * 60 * 60 * 24));

  const parts: string[] = [];

  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0 || hours > 0 || days > 0) {
    parts.push(`${minutes}m`);
  }
  if (parts.length === 0 || (days === 0 && hours === 0)) {
    parts.push(`${seconds}s`);
  }

  return parts.join(' ');
}

/**
 * Format a duration in milliseconds as a compact string.
 * @example formatDurationCompact(5000) => "5s"
 * @example formatDurationCompact(65000) => "1m 5s"
 */
export function formatDurationCompact(durationMs: number): string {
  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }
  
  const seconds = Math.floor(durationMs / 1000) % 60;
  const minutes = Math.floor(durationMs / (1000 * 60));

  if (minutes === 0) {
    return `${seconds}s`;
  }
  
  if (seconds === 0) {
    return `${minutes}m`;
  }

  return `${minutes}m ${seconds}s`;
}

/**
 * Format a timestamp as a human-readable date string.
 * Uses browser's locale by default for international support.
 * @example formatDate(1704067200000) => "Dec 30, 2025 13:18" (in en-US locale)
 */
export function formatDate(timestamp: number, locale?: string): string {
  const date = new Date(timestamp);
  
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  };

  return date.toLocaleString(locale, options).replace(',', '');
}

/**
 * Format a timestamp as a relative time string.
 * @example formatRelativeTime(Date.now() - 60000) => "1 minute ago"
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  }
  if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  }
  if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  }
  return 'just now';
}

/**
 * Format file changes summary.
 * @example formatFileChanges({ additions: 10, deletions: 5, files: 3 }) => "+10 -5 (3 files)"
 */
export function formatFileChanges(summary: { additions: number; deletions: number; files: number }): string {
  const parts: string[] = [];
  
  if (summary.additions > 0) {
    parts.push(`+${summary.additions}`);
  }
  if (summary.deletions > 0) {
    parts.push(`-${summary.deletions}`);
  }
  
  const fileText = summary.files === 1 ? '1 file' : `${summary.files} files`;
  
  if (parts.length > 0) {
    return `${parts.join(' ')} (${fileText})`;
  }
  
  return fileText;
}

/**
 * Truncate text to a maximum length with ellipsis.
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength - 3) + '...';
}
