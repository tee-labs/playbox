import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockGetPlatformDb } = vi.hoisted(() => ({
  mockGetPlatformDb: vi.fn(),
}));

vi.mock('../../../src/platforms', () => ({
  getPlatformDb: mockGetPlatformDb,
}));

import { getDefaultConfig, getDefaultConfigCached, revalidateConfigCache } from '../../../src/config/default';

describe('Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('revalidateConfigCache', () => {
    it('should be callable', () => {
      expect(typeof revalidateConfigCache).toBe('function');
    });
  });

  describe('getDefaultConfigCached', () => {
    it('should return null when no D1 available', async () => {
      mockGetPlatformDb.mockReturnValue(null);
      const result = await getDefaultConfigCached();
      expect(result).toBeNull();
    });
  });

  describe('getDefaultConfig', () => {
    it('should throw when no providers in D1', async () => {
      const mockDb = {
        prepare: vi.fn().mockReturnValue({
          bind: vi.fn().mockReturnValue({
            all: vi.fn().mockResolvedValue({ results: [], success: true }),
          }),
        }),
      };
      mockGetPlatformDb.mockReturnValue(mockDb as any);

      await expect(getDefaultConfig()).rejects.toThrow('No provider configuration found');
    });
  });
});
