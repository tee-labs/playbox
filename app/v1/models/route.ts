import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createJsonResponse, createUnauthorizedResponse } from '@/lib/response-helpers';
import { getConfig } from '@/config';
import type { ProviderConfig } from '@/types';
import { getTypedContext } from '@/lib/cloudflare-context';

export const dynamic = 'force-dynamic';

interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export async function GET(request: NextRequest) {
  const { env } = getTypedContext();

  if (!(await authenticate(request, env))) {
    return createUnauthorizedResponse();
  }

  try {
    const config = getConfig(env);
    const providers = config.providers;

    const anthropicVersion = request.headers.get('anthropic-version');
    const url = new URL(request.url);
    const familyParam = url.searchParams.get('family');
    const targetFamily = familyParam ?? (anthropicVersion ? 'anthropic' : 'openai');

    const modelsList: ModelInfo[] = [];
    const seenIds = new Set<string>();

    for (const [providerName, providerData] of Object.entries(providers)) {
      const provider = providerData as unknown as ProviderConfig;

      if (provider.family === 'gemini') {
        continue;
      }

      if (provider.family !== targetFamily) {
        continue;
      }

      if (Array.isArray(provider.models)) {
        provider.models.forEach((modelId: string) => {
          // Return format: providerName/modelId (e.g., doubao/ark-code-latest)
          const prefixedModelId = `${providerName}/${modelId}`;
          if (!seenIds.has(prefixedModelId)) {
            seenIds.add(prefixedModelId);
            modelsList.push({
              id: prefixedModelId,
              object: 'model',
              created: 1739116800,
              owned_by: providerName,
            });
          }
        });
      }
    }

    return createJsonResponse({
      object: 'list',
      data: modelsList,
    });
  } catch (error) {
    console.error('Error in GET /v1/models:', error);
    return createJsonResponse(
      {
        error: {
          message: 'Internal Server Error',
          type: 'internal_error',
        },
      },
      500
    );
  }
}
