/**
 * Extracts the cwd field from JSONL content.
 * Parses lines looking for JSON object with cwd field, returns first match.
 */
export function extractCwdFromJsonl(content: string): string | null {
  if (!content || !content.trim()) {
    return null;
  }

  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    try {
      const parsed = JSON.parse(trimmed);
      if (parsed && typeof parsed.cwd === 'string') {
        return parsed.cwd;
      }
    } catch {
      // Skip malformed JSON lines
    }
  }

  return null;
}
