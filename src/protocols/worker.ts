import { ProtocolAdapter, Env, Provider, ExecutionContext } from './types';
import { KeyManager } from '../managers/key';

interface CloudflareKey {
  accountId: string;
  apiKey: string;
}

export function createWorkerProtocol(): ProtocolAdapter {
  return {
    name: 'worker',
    getAttempt: () => 3,
    getApiKey: async (env: Env, provider: Provider, ctx: ExecutionContext): Promise<string> =>
      KeyManager.getRandomApiKey(env, provider, ctx),
    getEndpoint: async (
      provider: Provider,
      _model: string,
      _isStream: boolean,
      apiKey: string,
      _isEmbedding?: boolean
    ): Promise<string> => {
      const { accountId } = JSON.parse(apiKey) as CloudflareKey;
      const baseUrl = provider.endpoint ?? 'https://api.cloudflare.com';
      return `${baseUrl}/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
    },
    getHeaders: async (_provider: Provider, _env: Env, _ctx: ExecutionContext, apiKey: string): Promise<Record<string, string>> => {
      const { apiKey: cfApiKey } = JSON.parse(apiKey) as CloudflareKey;
      return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cfApiKey}`,
      };
    },
  };
}
