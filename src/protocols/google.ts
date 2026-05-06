import { ProtocolAdapter, Env, Provider, ExecutionContext } from './types';
import { KeyManager } from '../managers/key';

export function createGoogleProtocol(): ProtocolAdapter {
  return {
    name: 'google',
    getAttempt: () => 3,
    getApiKey: async (env: Env, provider: Provider, ctx: ExecutionContext): Promise<string> =>
      KeyManager.getRandomApiKey(env, provider, ctx),
    getEndpoint: async (provider: Provider, model: string, isStream: boolean, apiKey: string, _isEmbedding?: boolean): Promise<string> => {
      const action = isStream ? 'streamGenerateContent' : 'generateContent';
      const sseParam = isStream ? '&alt=sse' : '';
      return `${provider.endpoint}/v1beta/models/${model}:${action}?key=${apiKey}${sseParam}`;
    },
    getHeaders: async (provider: Provider, env: Env, ctx: ExecutionContext, apiKey: string): Promise<Record<string, string>> => ({
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    }),
  };
}
