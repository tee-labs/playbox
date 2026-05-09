import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('../../../src/managers/key', () => ({
  KeyManager: {
    getRandomApiKey: vi.fn().mockResolvedValue('mock-api-key'),
  },
}));

import { createOpenAIProtocol } from '../../../src/protocols/openai';
import { createMockEnv, createMockExecutionContext, createMockProviderConfig } from '../../factories';
import type { Env } from '../../../src/types';
import type { Provider, ExecutionContext } from '../../../src/protocols/types';

describe('OpenAI Protocol Adapter', () => {
  let protocol: ReturnType<typeof createOpenAIProtocol>;

  beforeEach(() => {
    protocol = createOpenAIProtocol();
  });

  it('should create protocol instance', () => {
    expect(protocol).toBeDefined();
    expect(protocol.name).toBe('openai');
  });

  it('should have required core methods', () => {
    expect(typeof protocol.getAttempt).toBe('function');
    expect(typeof protocol.getApiKey).toBe('function');
    expect(typeof protocol.getEndpoint).toBe('function');
    expect(typeof protocol.getHeaders).toBe('function');
  });

  it('should NOT have conversion methods (pass-through adapter)', () => {
    expect(protocol.toStandardRequest).toBeUndefined();
    expect(protocol.fromStandardRequest).toBeUndefined();
    expect(protocol.toStandardResponse).toBeUndefined();
    expect(protocol.fromStandardResponse).toBeUndefined();
    expect(protocol.createToStandardStream).toBeUndefined();
    expect(protocol.createFromStandardStream).toBeUndefined();
  });

  it('should return default attempt count', () => {
    expect(protocol.getAttempt()).toBe(3);
  });

  it('should handle getHeaders correctly', async () => {
    const mockProvider = {
      type: 'openai',
      endpoint: 'https://api.openai.com',
      key: 'test-key',
      models: ['gpt-3.5-turbo'],
    } as Provider;

    const mockEnv = {} as Env;
    const apiKey = 'test-api-key';

    const headers = await protocol.getHeaders(mockProvider, mockEnv, apiKey);
    expect(headers).toEqual({
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-api-key',
    });
  });

  it('should handle getEndpoint correctly', async () => {
    const mockProvider = {
      type: 'openai',
      endpoint: 'https://api.openai.com',
      key: 'test-key',
      models: ['gpt-3.5-turbo'],
    } as Provider;

    const endpoint = await protocol.getEndpoint(mockProvider, 'gpt-3.5-turbo', false, 'test-key');
    expect(endpoint).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('should handle missing endpoint gracefully', async () => {
    const mockProvider = {
      type: 'openai',
      endpoint: undefined,
      key: 'test-key',
      models: ['gpt-3.5-turbo'],
    } as unknown as Provider;

    const endpoint = await protocol.getEndpoint(mockProvider, 'gpt-3.5-turbo', false, 'test-key');
    expect(endpoint).toBe('https://api.openai.com/v1/chat/completions');
  });

  it('should call KeyManager.getRandomApiKey for getApiKey', async () => {
    const mockEnv = createMockEnv();
    const mockCtx = createMockExecutionContext();
    const mockProvider = createMockProviderConfig({ type: 'openai', key: 'test-provider' });

    mockEnv.PLAYBOX_D1 = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnThis(),
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    } as any;

    const apiKey = await protocol.getApiKey(mockEnv, mockProvider);
    expect(apiKey).toBe('mock-api-key');
  });
});
