import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { saveHtmlFile } from './saveFile';

describe('saveHtmlFile', () => {
  const mockContent = '<html><body>Test</body></html>';
  const mockSuggestedName = 'test.html';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('with File System Access API', () => {
    it('saves file successfully and returns true', async () => {
      const mockWritable = {
        write: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
      };

      const mockHandle = {
        createWritable: vi.fn().mockResolvedValue(mockWritable),
      };

      const mockShowSaveFilePicker = vi.fn().mockResolvedValue(mockHandle);
      vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);

      const result = await saveHtmlFile(mockContent, mockSuggestedName);

      expect(result).toBe(true);
      expect(mockShowSaveFilePicker).toHaveBeenCalledWith({
        suggestedName: mockSuggestedName,
        types: [
          {
            description: 'HTML Files',
            accept: { 'text/html': ['.html'] },
          },
        ],
      });
      expect(mockHandle.createWritable).toHaveBeenCalled();
      expect(mockWritable.write).toHaveBeenCalledWith(mockContent);
      expect(mockWritable.close).toHaveBeenCalled();
    });

    it('returns false when user cancels the save dialog', async () => {
      const abortError = new Error('User cancelled');
      abortError.name = 'AbortError';

      const mockShowSaveFilePicker = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);

      const result = await saveHtmlFile(mockContent, mockSuggestedName);

      expect(result).toBe(false);
    });

    it('throws non-AbortError errors', async () => {
      const otherError = new Error('Permission denied');
      otherError.name = 'NotAllowedError';

      const mockShowSaveFilePicker = vi.fn().mockRejectedValue(otherError);
      vi.stubGlobal('showSaveFilePicker', mockShowSaveFilePicker);

      await expect(saveHtmlFile(mockContent, mockSuggestedName)).rejects.toThrow(
        'Permission denied'
      );
    });
  });

  describe('fallback to download link', () => {
    let mockCreateObjectURL: ReturnType<typeof vi.fn>;
    let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
    let mockClick: ReturnType<typeof vi.fn>;
    let createdLink: Partial<HTMLAnchorElement>;
    let appendChildSpy: ReturnType<typeof vi.spyOn>;
    let removeChildSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      // Ensure showSaveFilePicker is NOT available
      vi.stubGlobal('showSaveFilePicker', undefined);

      mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
      mockRevokeObjectURL = vi.fn();
      mockClick = vi.fn();

      createdLink = {
        href: '',
        download: '',
        click: mockClick as unknown as () => void,
      };

      vi.spyOn(document, 'createElement').mockReturnValue(
        createdLink as HTMLAnchorElement
      );

      appendChildSpy = vi
        .spyOn(document.body, 'appendChild')
        .mockImplementation((node) => node);
      removeChildSpy = vi
        .spyOn(document.body, 'removeChild')
        .mockImplementation((node) => node);

      vi.stubGlobal('URL', {
        createObjectURL: mockCreateObjectURL,
        revokeObjectURL: mockRevokeObjectURL,
      });
    });

    it('creates download link and returns true', async () => {
      vi.useFakeTimers();
      
      const result = await saveHtmlFile(mockContent, mockSuggestedName);

      expect(result).toBe(true);
      expect(document.createElement).toHaveBeenCalledWith('a');
      expect(createdLink.href).toBe('blob:test-url');
      expect(createdLink.download).toBe(mockSuggestedName);
      expect(appendChildSpy).toHaveBeenCalledWith(createdLink);
      expect(mockClick).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalledWith(createdLink);
      
      // URL is revoked asynchronously to ensure browser has time to start download
      expect(mockRevokeObjectURL).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
      
      vi.useRealTimers();
    });

    it('creates blob with correct content type', async () => {
      // We can't directly spy on Blob constructor, but we can verify
      // createObjectURL was called (which receives the blob)
      await saveHtmlFile(mockContent, mockSuggestedName);

      expect(mockCreateObjectURL).toHaveBeenCalled();
      const blobArg = mockCreateObjectURL.mock.calls[0][0];
      expect(blobArg).toBeInstanceOf(Blob);
      expect(blobArg.type).toBe('text/html');
    });
  });
});
