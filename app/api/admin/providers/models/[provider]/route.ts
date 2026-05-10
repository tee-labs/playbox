import { NextRequest } from 'next/server';
import { createJsonResponse, createInternalErrorResponse } from '@/lib/response-helpers';
import { getConfig } from '@/config';
import { KeyManager } from '@/managers/key';
import type { ProviderConfig } from '@/types/provider';

export const dynamic = 'force-dynamic';

interface ModelInfo {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
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

export async function GET(_request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  try {
    const { provider: providerName } = await params;
    const config = await getConfig();

    const provider = config.providers[providerName] as ProviderConfig | undefined;
    if (!provider) {
      return createJsonResponse({ success: false, error: `Provider "${providerName}" not found` }, 404);
    }

    let apiKey: string;
    try {
      apiKey = await KeyManager.getRandomApiKey(provider);
    } catch (keyError) {
      return createJsonResponse(
        {
          success: false,
          error: `No API key found: ${(keyError as Error).message}`,
          models: [],
        },
        400
      );
    }

    let models: ModelInfo[] = [];
    try {
      if (provider.family === 'openai' || provider.family === 'rerank') {
        models = await fetchOpenAIModels(provider.endpoint, apiKey);
      } else if (provider.family === 'gemini') {
        models = await fetchGeminiModels(provider.endpoint, apiKey);
      } else if (provider.family === 'anthropic') {
        models = (provider.models || []).map((m: string) => ({
          id: m,
          object: 'model',
          owned_by: 'anthropic',
        }));
      }
    } catch (error) {
      return createJsonResponse(
        {
          success: false,
          error: (error as Error).message,
          models: [],
        },
        500
      );
    }

    return createJsonResponse({
      success: true,
      provider: providerName,
      family: provider.family,
      endpoint: provider.endpoint,
      configuredModels: provider.models || [],
      models,
    });
  } catch (error) {
    console.error('Error fetching provider models:', error);
    return createInternalErrorResponse((error as Error).message);
  }
}
