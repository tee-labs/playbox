import { ProtocolAdapter, Env, Provider, ExecutionContext } from './types';
import { KeyManager } from '../managers/key';

export function createOpenAIProtocol(): ProtocolAdapter {
  return {
    name: 'openai',
    getAttempt: () => 3,
    getApiKey: async (env: Env, provider: Provider, ctx: ExecutionContext): Promise<string> =>
      KeyManager.getRandomApiKey(env, provider, ctx),
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
    getHeaders: async (provider: Provider, env: Env, ctx: ExecutionContext, apiKey: string): Promise<Record<string, string>> => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
  };
}
