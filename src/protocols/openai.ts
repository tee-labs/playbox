import { ProtocolAdapter, Env, Provider } from './types';
import { KeyManager } from '../managers/key';

export function createOpenAIProtocol(): ProtocolAdapter {
  return {
    name: 'openai',
    getAttempt: () => 3,
    getApiKey: async (env: Env, provider: Provider): Promise<string> => KeyManager.getRandomApiKey(provider),
    getEndpoint: async (
      provider: Provider,
      _model: string,
      _isStream: boolean,
      _apiKey: string,
      isEmbedding?: boolean,
      isRerank?: boolean
    ): Promise<string> => {
      const baseUrl = provider.endpoint ?? 'https://api.openai.com';
      const suffix = baseUrl.match(/\/v\d+$/) ? '' : '/v1';
      if (isEmbedding) {
        return `${baseUrl}${suffix}/embeddings`;
      }
      if (isRerank) {
        return `${baseUrl}${suffix}/rerank`;
      }
      return `${baseUrl}${suffix}/chat/completions`;
    },
    getHeaders: async (_provider: Provider, _env: Env, apiKey: string): Promise<Record<string, string>> => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
  };
}
