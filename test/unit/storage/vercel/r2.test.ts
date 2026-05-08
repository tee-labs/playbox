import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { R2Storage } from '../../../../src/storage/interface';

// Mock @vercel/blob — factory must not reference external variables due to hoisting
vi.mock('@vercel/blob', () => ({
  put: vi.fn(),
  head: vi.fn(),
  del: vi.fn(),
  list: vi.fn(),
}));

// Mock global fetch for get() method
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Import after mock
import { VercelR2Adapter } from '../../../../src/storage/vercel/r2';
import { put as mockPutFn, head as mockHeadFn, del as mockDelFn, list as mockListFn } from '@vercel/blob';

const mockPut = mockPutFn as unknown as ReturnType<typeof vi.fn>;
const mockHead = mockHeadFn as unknown as ReturnType<typeof vi.fn>;
const mockDel = mockDelFn as unknown as ReturnType<typeof vi.fn>;
const mockList = mockListFn as unknown as ReturnType<typeof vi.fn>;

describe('VercelR2Adapter', () => {
  let adapter: R2Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new VercelR2Adapter();
  });

  describe('put', () => {
    it('stores blob with public access', async () => {
      mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test-key' });
      await adapter.put('test-key', 'test-body');
      expect(mockPut).toHaveBeenCalledWith('test-key', 'test-body', { access: 'public' });
    });

    it('stores blob with additional options', async () => {
      mockPut.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test-key' });
      await adapter.put('test-key', 'test-body', { contentType: 'text/plain' });
      expect(mockPut).toHaveBeenCalledWith('test-key', 'test-body', {
        access: 'public',
        contentType: 'text/plain',
      });
    });
  });

  describe('get', () => {
    it('returns body stream for existing blob', async () => {
      mockHead.mockResolvedValue({ url: 'https://blob.vercel-storage.com/test-key' });
      const mockBody = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode('test-body'));
          controller.close();
        },
      });
      mockFetch.mockResolvedValue({ body: mockBody });
      const result = await adapter.get('test-key');
      expect(result).toBeInstanceOf(ReadableStream);
      expect(mockHead).toHaveBeenCalledWith('test-key');
    });

    it('returns null for non-existent blob', async () => {
      mockHead.mockResolvedValue(null);
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('returns null on error', async () => {
      mockHead.mockRejectedValue(new Error('Not found'));
      const result = await adapter.get('error-key');
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('deletes blob from Vercel Blob', async () => {
      mockDel.mockResolvedValue(undefined);
      await adapter.delete('test-key');
      expect(mockDel).toHaveBeenCalledWith('test-key');
    });
  });

  describe('list', () => {
    it('lists all blobs without prefix', async () => {
      mockList.mockResolvedValue({
        blobs: [
          { pathname: 'file1.txt' },
          { pathname: 'file2.txt' },
        ],
      });
      const keys = await adapter.list();
      expect(keys).toEqual(['file1.txt', 'file2.txt']);
    });

    it('lists blobs with prefix', async () => {
      mockList.mockResolvedValue({
        blobs: [
          { pathname: 'dir/file1.txt' },
          { pathname: 'dir/file2.txt' },
        ],
      });
      const keys = await adapter.list('dir/');
      expect(mockList).toHaveBeenCalledWith({ prefix: 'dir/' });
      expect(keys).toEqual(['dir/file1.txt', 'dir/file2.txt']);
    });

    it('returns empty array when no blobs match', async () => {
      mockList.mockResolvedValue({ blobs: [] });
      const keys = await adapter.list('non-existent/');
      expect(keys).toEqual([]);
    });
  });

  describe('interface compliance', () => {
    it('implements R2Storage interface', () => {
      expect(typeof adapter.put).toBe('function');
      expect(typeof adapter.get).toBe('function');
      expect(typeof adapter.delete).toBe('function');
      expect(typeof adapter.list).toBe('function');
    });
  });
});
