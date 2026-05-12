import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@opennextjs/cloudflare', () => ({
  getCloudflareContext: vi.fn(),
}));

const { mockGetDefaultConfigCached } = vi.hoisted(() => ({
  mockGetDefaultConfigCached: vi.fn(),
}));

vi.mock('../../../src/config/default', () => ({
  getDefaultConfigCached: mockGetDefaultConfigCached,
  getDefaultConfig: vi.fn(() => mockGetDefaultConfigCached()),
}));

import { getConfig, resolveProvider, ConfigManager } from '../../../src/config/index';
import type { Config } from '../../../src/config/default';
import { ProtocolFamily } from '../../../src/types/provider';

const mockConfig: Config = {
  providers: {
    longcat: {
      type: 'openai',
      family: 'openai',
      endpoint: 'https://api.longcat.chat/openai',
      key: 'LongCat',
      models: ['LongCat-Flash-Chat', 'LongCat-Flash-Lite'],
    },
    longcat_claude: {
      type: 'anthropic',
      family: 'anthropic',
      endpoint: 'https://api.longcat.chat/anthropic',
      key: 'LongCat',
      models: ['LongCat-Flash-Chat'],
      authType: 'bearer',
    },
  },
  default_provider: 'longcat',
};

describe('Config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getConfig', () => {
    it('should throw error when D1 is unavailable', async () => {
      mockGetDefaultConfigCached.mockRejectedValue(
        new Error('No provider configuration found. Please configure providers in D1 database.')
      );

      await expect(getConfig()).rejects.toThrow('No provider configuration found');
    });

    it('should load config from D1 when available', async () => {
      mockGetDefaultConfigCached.mockResolvedValue({
        providers: {
          longcat: {
            type: 'openai',
            family: 'openai',
            endpoint: 'https://api.longcat.chat/openai',
            key: 'LongCat',
            models: ['LongCat-Flash-Chat'],
            authType: 'bearer',
          },
        },
        default_provider: 'longcat',
      });

      const config = await getConfig();
      expect(config.providers['longcat']).toBeDefined();
      expect(config.default_provider).toBe('longcat');
    });
  });

  describe('resolveProvider', () => {
    it('should resolve provider by model name', () => {
      const config = mockConfig;

      const result = resolveProvider(config, 'LongCat-Flash-Chat');

      expect(result.name).toBe('longcat');
      expect(result.provider.type).toBe('openai');
    });

    it('should fallback to first matching provider when family not found', () => {
      const config = mockConfig;

      const result = resolveProvider(config, 'LongCat-Flash-Chat', 'nonexistent' as ProtocolFamily);

      expect(result.name).toBe('longcat');
    });

    it('should return default_provider when model not found', () => {
      const config = mockConfig;

      const result = resolveProvider(config, 'nonexistent-model');

      expect(result.name).toBe(config.default_provider);
    });

    it('should handle empty providers object', () => {
      const config = {
        providers: {},
        default_provider: 'default',
      };

      const result = resolveProvider(config, 'any-model');

      expect(result.name).toBe('default');
      expect(result.provider).toBeUndefined();
    });

  it('should resolve provider with prefixed model format', () => {
    const config = mockConfig;

    const result = resolveProvider(config, 'longcat/LongCat-Flash-Chat');

    expect(result.name).toBe('longcat');
    expect(result.realModel).toBe('LongCat-Flash-Chat');
  });

  describe('auto model resolution', () => {
    it('should resolve "provider/auto" by randomly picking from provider models when autoModels is empty', () => {
      const result = resolveProvider(mockConfig, 'longcat/auto');

      expect(result.name).toBe('longcat');
      expect(['LongCat-Flash-Chat', 'LongCat-Flash-Lite']).toContain(result.realModel);
    });

    it('should resolve "provider/auto" by picking from autoModels when configured', () => {
      const config: Config = {
        providers: {
          longcat: {
            type: 'openai',
            family: 'openai',
            endpoint: 'https://api.longcat.chat/openai',
            key: 'LongCat',
            models: ['LongCat-Flash-Chat', 'LongCat-Flash-Lite', 'LongCat-Flash-Thinking'],
            autoModels: 'LongCat-Flash-Chat,LongCat-Flash-Lite',
          },
        },
        default_provider: 'longcat',
      };

      const result = resolveProvider(config, 'longcat/auto');

      expect(result.name).toBe('longcat');
      expect(['LongCat-Flash-Chat', 'LongCat-Flash-Lite']).toContain(result.realModel);
      // Should never pick a model outside autoModels
      expect(result.realModel).not.toBe('LongCat-Flash-Thinking');
    });

    it('should resolve bare "auto" from default provider', () => {
      const result = resolveProvider(mockConfig, 'auto');

      expect(result.name).toBe('longcat');
      expect(['LongCat-Flash-Chat', 'LongCat-Flash-Lite']).toContain(result.realModel);
    });

    it('should resolve "auto" with autoModels containing spaces', () => {
      const config: Config = {
        providers: {
          longcat: {
            type: 'openai',
            family: 'openai',
            endpoint: 'https://api.longcat.chat/openai',
            key: 'LongCat',
            models: ['LongCat-Flash-Chat', 'LongCat-Flash-Lite', 'LongCat-Flash-Thinking'],
            autoModels: '  LongCat-Flash-Chat , LongCat-Flash-Lite  ',
          },
        },
        default_provider: 'longcat',
      };

      const result = resolveProvider(config, 'longcat/auto');

      expect(result.name).toBe('longcat');
      expect(['LongCat-Flash-Chat', 'LongCat-Flash-Lite']).toContain(result.realModel);
      expect(result.realModel).not.toBe('LongCat-Flash-Thinking');
    });

    it('should fall back to full model list when autoModels has no valid entries', () => {
      const config: Config = {
        providers: {
          longcat: {
            type: 'openai',
            family: 'openai',
            endpoint: 'https://api.longcat.chat/openai',
            key: 'LongCat',
            models: ['LongCat-Flash-Chat', 'LongCat-Flash-Lite'],
            autoModels: '   ',
          },
        },
        default_provider: 'longcat',
      };

      const result = resolveProvider(config, 'longcat/auto');

      expect(result.name).toBe('longcat');
      expect(['LongCat-Flash-Chat', 'LongCat-Flash-Lite']).toContain(result.realModel);
    });
  });
});

  describe('ConfigManager', () => {
    it('should expose getConfig function', () => {
      expect(ConfigManager.getConfig).toBe(getConfig);
    });

    it('should expose resolveProvider function', () => {
      expect(ConfigManager.resolveProvider).toBe(resolveProvider);
    });

    it('should work through ConfigManager.getConfig', async () => {
      mockGetDefaultConfigCached.mockRejectedValue(
        new Error('No provider configuration found. Please configure providers in D1 database.')
      );

      await expect(ConfigManager.getConfig()).rejects.toThrow('No provider configuration found');
    });

    it('should work through ConfigManager.resolveProvider', () => {
      const config = mockConfig;

      const result = ConfigManager.resolveProvider(config, 'LongCat-Flash-Chat');

      expect(result.name).toBe('longcat');
    });
  });
});
