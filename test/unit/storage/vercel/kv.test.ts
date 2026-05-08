import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { KVStorage } from '../../../../src/storage/interface';

// Mock @vercel/kv — factory must not reference external variables due to hoisting
vi.mock('@vercel/kv', () => ({
  kv: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
  },
}));

// Import after mock
import { VercelKVAdapter } from '../../../../src/storage/vercel/kv';
import { kv } from '@vercel/kv';

const mockKv = kv as unknown as {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  del: ReturnType<typeof vi.fn>;
};

describe('VercelKVAdapter', () => {
  let adapter: KVStorage;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new VercelKVAdapter();
  });

  describe('get', () => {
    it('returns value from Vercel KV', async () => {
      mockKv.get.mockResolvedValue('test-value');
      const result = await adapter.get('test-key');
      expect(result).toBe('test-value');
      expect(mockKv.get).toHaveBeenCalledWith('test-key');
    });

    it('returns null for non-existent key', async () => {
      mockKv.get.mockResolvedValue(null);
      const result = await adapter.get('non-existent');
      expect(result).toBeNull();
    });

    it('passes json type option', async () => {
      mockKv.get.mockResolvedValue({ foo: 'bar' });
      const result = await adapter.get('obj-key', { type: 'json' });
      expect(result).toEqual({ foo: 'bar' });
    });
  });

  describe('put', () => {
    it('stores value without TTL', async () => {
      mockKv.set.mockResolvedValue('OK');
      await adapter.put('test-key', 'test-value');
      expect(mockKv.set).toHaveBeenCalledWith('test-key', 'test-value');
    });

    it('stores value with expirationTtl', async () => {
      mockKv.set.mockResolvedValue('OK');
      await adapter.put('cache-key', 'cached-value', { expirationTtl: 300 });
      expect(mockKv.set).toHaveBeenCalledWith('cache-key', 'cached-value', { ex: 300 });
    });

    it('stores object values', async () => {
      mockKv.set.mockResolvedValue('OK');
      await adapter.put('obj-key', { foo: 'bar' });
      expect(mockKv.set).toHaveBeenCalledWith('obj-key', { foo: 'bar' });
    });
  });

  describe('delete', () => {
    it('deletes key from Vercel KV', async () => {
      mockKv.del.mockResolvedValue(1);
      await adapter.delete('test-key');
      expect(mockKv.del).toHaveBeenCalledWith('test-key');
    });

    it('does not throw for non-existent key', async () => {
      mockKv.del.mockResolvedValue(0);
      await expect(adapter.delete('non-existent')).resolves.not.toThrow();
    });
  });

  describe('interface compliance', () => {
    it('implements KVStorage interface', () => {
      expect(typeof adapter.get).toBe('function');
      expect(typeof adapter.put).toBe('function');
      expect(typeof adapter.delete).toBe('function');
    });
  });
});
