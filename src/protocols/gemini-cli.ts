import { ProtocolAdapter, Env, Provider, ExecutionContext } from './types';
import { KeyManager } from '../managers/key';

export function createGeminiCliProtocol(): ProtocolAdapter {
  return {
    name: 'gemini-cli',
    getAttempt: () => 1,
    getApiKey: async (env: Env, provider: Provider, ctx: ExecutionContext): Promise<string> =>
      KeyManager.getValidAccessToken(env, provider.key, ctx),
    getEndpoint: async (provider: Provider, model: string, isStream: boolean, _apiKey: string, _isEmbedding?: boolean): Promise<string> => {
      const action = isStream ? 'streamGenerateContent?alt=sse' : 'generateContent';
      return `${provider.endpoint}:${action}`;
    },
    getHeaders: async (provider: Provider, env: Env, ctx: ExecutionContext, apiKey: string): Promise<Record<string, string>> => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'User-Agent': 'google-api-nodejs-client/10.5.0',
      'x-goog-api-client': 'gl-node/24.14.0',
    }),
  };
}
