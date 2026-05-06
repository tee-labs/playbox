import { NextRequest } from 'next/server';
import { getTypedContext } from '@/lib/cloudflare-context';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';
import { getConfig } from '@/config';
import { ProtocolFamily } from '@/types/provider';
import { KeyManager } from '@/managers/key';
import type { ProviderConfig } from '@/types';

export const dynamic = 'force-dynamic';

interface ModelInfo {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

interface ProviderModels {
  provider: string;
  family: ProtocolFamily;
  endpoint: string;
  models: string[];
  fetched?: ModelInfo[];
  error?: string;
}

async function fetchOpenAIModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  const url = `${baseUrl}/v1/models`;
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = (await response.json()) as { data?: ModelInfo[] };
  return data.data || [];
}

async function fetchGeminiModels(baseUrl: string, apiKey: string): Promise<ModelInfo[]> {
  const url = `${baseUrl}/v1beta/models?key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = (await response.json()) as {
    models?: { name: string; supportedGenerationMethods?: string[] }[];
  };
  return (data.models || []).map((m) => ({
    id: m.name.replace('models/', ''),
    object: 'model',
    owned_by: 'google',
  }));
}

export async function GET(_request: NextRequest) {
  try {
    const { env, ctx } = getTypedContext();
    const config = getConfig(env);

    const providersByFamily: Record<ProtocolFamily, ProviderModels[]> = {
      openai: [],
      anthropic: [],
      gemini: [],
      embedding: [],
    };

    for (const [name, provider] of Object.entries(config.providers)) {
      const p = provider as unknown as ProviderConfig;
      const providerInfo: ProviderModels = {
        provider: name,
        family: p.family as ProtocolFamily,
        endpoint: p.endpoint,
        models: p.models || [],
      };

      let apiKey: string;
      try {
        apiKey = await KeyManager.getRandomApiKey(env, p, ctx);
      } catch (keyError) {
        providerInfo.error = `No API key found: ${(keyError as Error).message}`;
        providerInfo.fetched =
          p.models?.map((m: string) => ({
            id: m,
            object: 'model',
          })) || [];
        providersByFamily[p.family as ProtocolFamily].push(providerInfo);
        continue;
      }

      try {
        if (p.family === 'openai' || p.family === 'embedding') {
          providerInfo.fetched = await fetchOpenAIModels(p.endpoint, apiKey);
        } else if (p.family === 'gemini') {
          providerInfo.fetched = await fetchGeminiModels(p.endpoint, apiKey);
        } else if (p.family === 'anthropic') {
          providerInfo.fetched =
            p.models?.map((m: string) => ({
              id: m,
              object: 'model',
              owned_by: 'anthropic',
            })) || [];
        }
      } catch (error) {
        providerInfo.error = (error as Error).message;
        providerInfo.fetched =
          p.models?.map((m: string) => ({
            id: m,
            object: 'model',
          })) || [];
      }

      providersByFamily[p.family as ProtocolFamily].push(providerInfo);
    }

    return createJsonResponse({
      success: true,
      providers: providersByFamily,
    });
  } catch (error) {
    console.error('Error fetching provider models:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
