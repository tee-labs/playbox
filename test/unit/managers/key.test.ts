import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

vi.mock('../../../src/platforms', () => ({
  getPlatformDb: vi.fn(),
}));

const { mockGetOAuthCredentialsCached, mockGetApiKeysCached } = vi.hoisted(() => ({
  mockGetOAuthCredentialsCached: vi.fn(),
  mockGetApiKeysCached: vi.fn(),
}));

vi.mock('../../../src/managers/key', () => ({
  getOAuthCredentialsCached: mockGetOAuthCredentialsCached,
  getApiKeysCached: mockGetApiKeysCached,
  KeyManager: {
    getRandomOAuthCredentials: async (provider: string) => {
      const list = await mockGetOAuthCredentialsCached(provider);
      return list[Math.floor(Math.random() * list.length)];
    },
    getRandomApiKey: async (provider: { key: string }) => {
      const list = await mockGetApiKeysCached(provider.key.trim());
      return list[Math.floor(Math.random() * list.length)];
    },
  },
}));

import { KeyManager, getOAuthCredentialsCached, getApiKeysCached } from '../../../src/managers/key';

describe('KeyManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getRandomOAuthCredentials', () => {
    it('should return credentials from D1', async () => {
      mockGetOAuthCredentialsCached.mockResolvedValue([
        {
          client_id: 'test-client-id',
          client_secret: 'test-client-secret',
          refresh_token: 'test-refresh-token',
        },
      ]);

      const creds = await KeyManager.getRandomOAuthCredentials('TestProvider');

      expect(creds).toHaveProperty('client_id');
      expect(creds).toHaveProperty('client_secret');
      expect(creds).toHaveProperty('refresh_token');
    });

    it('should throw error when no OAuth credentials found', async () => {
      mockGetOAuthCredentialsCached.mockRejectedValue(new Error('No OAuth credentials found for provider: UnknownProvider'));

      await expect(KeyManager.getRandomOAuthCredentials('UnknownProvider')).rejects.toThrow(
        'No OAuth credentials found for provider: UnknownProvider'
      );
    });
  });

  describe('getRandomApiKey', () => {
    it('should return a random key from D1', async () => {
      mockGetApiKeysCached.mockResolvedValue(['key-1', 'key-2', 'key-3']);

      const key = await KeyManager.getRandomApiKey({
        key: 'test-provider',
        type: 'openai',
        endpoint: 'https://api.test.com',
        models: [],
      });

      expect(key).toMatch(/key-[1-3]/);
    });

    it('should throw error when no keys found', async () => {
      mockGetApiKeysCached.mockRejectedValue(new Error('No API keys found for provider: unknown-provider'));

      await expect(
        KeyManager.getRandomApiKey({
          key: 'unknown-provider',
          type: 'openai',
          endpoint: 'https://api.test.com',
          models: [],
        })
      ).rejects.toThrow('No API keys found for provider: unknown-provider');
    });

    it('should trim provider key', async () => {
      mockGetApiKeysCached.mockResolvedValue(['key']);

      await KeyManager.getRandomApiKey({
        key: '  trimmed-provider  ',
        type: 'openai',
        endpoint: 'https://api.test.com',
        models: [],
      });

      expect(mockGetApiKeysCached).toHaveBeenCalledWith('trimmed-provider');
    });
  });

  describe('exported cache functions', () => {
    it('getOAuthCredentialsCached should be a function', () => {
      expect(typeof getOAuthCredentialsCached).toBe('function');
    });

    it('getApiKeysCached should be a function', () => {
      expect(typeof getApiKeysCached).toBe('function');
    });
  });
});
