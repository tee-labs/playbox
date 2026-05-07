import { describe, it, expect, vi, beforeEach } from 'vitest';
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
  describe('getConfig', () => {
    it('should throw error when D1 is unavailable', async () => {
      const env = {};

      await expect(getConfig(env)).rejects.toThrow('No provider configuration found');
    });

    it('should load config from D1 when available', async () => {
      const env = {
        PLAYBOX_D1: {
          prepare: () => ({
            all: () =>
              Promise.resolve({
                results: [
                  {
                    name: 'longcat',
                    type: 'openai',
                    family: 'openai',
                    endpoint: 'https://api.longcat.chat/openai',
                    key: 'LongCat',
                    models: JSON.stringify(['LongCat-Flash-Chat']),
                    auth_type: 'bearer',
                  },
                ],
              }),
          }),
        },
      };

      const config = await getConfig(env);
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
  });

  describe('ConfigManager', () => {
    it('should expose getConfig function', () => {
      expect(ConfigManager.getConfig).toBe(getConfig);
    });

    it('should expose resolveProvider function', () => {
      expect(ConfigManager.resolveProvider).toBe(resolveProvider);
    });

    it('should work through ConfigManager.getConfig', async () => {
      const env = {};

      await expect(ConfigManager.getConfig(env)).rejects.toThrow('No provider configuration found');
    });

    it('should work through ConfigManager.resolveProvider', () => {
      const config = mockConfig;

      const result = ConfigManager.resolveProvider(config, 'LongCat-Flash-Chat');

      expect(result.name).toBe('longcat');
    });
  });
});
