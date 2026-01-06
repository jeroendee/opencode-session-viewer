/**
 * Saves HTML content to a file using the File System Access API when available,
 * falling back to a download link for browsers without support (e.g., Firefox).
 *
 * @param content - The HTML content to save
 * @param suggestedName - The suggested filename for the save dialog
 * @returns true if saved successfully, false if user cancelled
 */
export async function saveHtmlFile(
  content: string,
  suggestedName: string
): Promise<boolean> {
  // Check if File System Access API is available
  if (typeof window.showSaveFilePicker === 'function') {
    return saveWithFileSystemAccess(content, suggestedName);
  }

  // Fallback for browsers without File System Access API support
  return saveWithDownloadLink(content, suggestedName);
}

async function saveWithFileSystemAccess(
  content: string,
  suggestedName: string
): Promise<boolean> {
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: 'HTML Files',
          accept: { 'text/html': ['.html'] },
        },
      ],
    });

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();

    return true;
  } catch (error) {
    // User cancelled the save dialog
    if (error instanceof Error && error.name === 'AbortError') {
      return false;
    }
    throw error;
  }
}

function saveWithDownloadLink(content: string, suggestedName: string): boolean {
  const blob = new Blob([content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;

  // Append to body, click, and remove
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the object URL asynchronously to ensure browser has time to start download
  setTimeout(() => URL.revokeObjectURL(url), 100);

  // Download link method always returns true since we can't detect cancellation
  return true;
}
