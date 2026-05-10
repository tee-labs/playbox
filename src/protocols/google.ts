import type { ProtocolAdapter, Provider } from './types';
import type { SqlClient } from '../db/types';
import { KeyManager } from '../managers/key';

export function createGoogleProtocol(): ProtocolAdapter {
  return {
    name: 'google',
    getAttempt: () => 3,
    getApiKey: async (_sql: SqlClient, provider: Provider): Promise<string> => KeyManager.getRandomApiKey(provider),
    getEndpoint: async (provider: Provider, model: string, isStream: boolean, apiKey: string, _isEmbedding?: boolean): Promise<string> => {
      const action = isStream ? 'streamGenerateContent' : 'generateContent';
      const sseParam = isStream ? '&alt=sse' : '';
      return `${provider.endpoint}/v1beta/models/${model}:${action}?key=${apiKey}${sseParam}`;
    },
    getHeaders: async (_provider: Provider, _sql: SqlClient, apiKey: string): Promise<Record<string, string>> => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    }),
  };
}
