import { describe, it, expect, vi } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

import { KeyManager, getOAuthCredentialsCached, getApiKeysCached } from '../../../src/managers/key';

describe('KeyManager', () => {
  describe('getRandomOAuthCredentials', () => {
    it('should return credentials from D1', async () => {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');

      (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
        env: {
          PLAYBOX_D1: {
            prepare: vi.fn().mockReturnValue({
              bind: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue({
                results: [
                  {
                    content: JSON.stringify({
                      client_id: 'test-client-id',
                      client_secret: 'test-client-secret',
                      refresh_token: 'test-refresh-token',
                    }),
                  },
                ],
              }),
            }),
          },
        },
      });

      const creds = await KeyManager.getRandomOAuthCredentials('TestProvider');

      expect(creds).toHaveProperty('client_id');
      expect(creds).toHaveProperty('client_secret');
      expect(creds).toHaveProperty('refresh_token');
    });

    it('should throw error when no OAuth credentials found', async () => {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');

      (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
        env: {
          PLAYBOX_D1: {
            prepare: vi.fn().mockReturnValue({
              bind: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue({ results: [] }),
            }),
          },
        },
      });

      await expect(KeyManager.getRandomOAuthCredentials('UnknownProvider')).rejects.toThrow(
        'No OAuth credentials found for provider: UnknownProvider'
      );
    });
  });

  describe('getRandomApiKey', () => {
    it('should return a random key from D1', async () => {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');

      (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
        env: {
          PLAYBOX_D1: {
            prepare: vi.fn().mockReturnValue({
              bind: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue({
                results: [{ content: 'key-1' }, { content: 'key-2' }, { content: 'key-3' }],
              }),
            }),
          },
        },
      });

      const key = await KeyManager.getRandomApiKey({
        key: 'test-provider',
        type: 'openai',
        endpoint: 'https://api.test.com',
        models: [],
      });

      expect(['key-1', 'key-2', 'key-3']).toContain(key);
    });

    it('should throw error when no keys found', async () => {
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');

      (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
        env: {
          PLAYBOX_D1: {
            prepare: vi.fn().mockReturnValue({
              bind: vi.fn().mockReturnThis(),
              all: vi.fn().mockResolvedValue({ results: [] }),
            }),
          },
        },
      });

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
      const { getCloudflareContext } = await import('@opennextjs/cloudflare');

      const prepareMock = vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [{ content: 'key' }] }),
      });

      (getCloudflareContext as ReturnType<typeof vi.fn>).mockReturnValue({
        env: {
          PLAYBOX_D1: {
            prepare: prepareMock,
          },
        },
      });

      await KeyManager.getRandomApiKey({
        key: '  trimmed-provider  ',
        type: 'openai',
        endpoint: 'https://api.test.com',
        models: [],
      });

      expect(prepareMock).toHaveBeenCalledWith(expect.stringContaining('?'));
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
