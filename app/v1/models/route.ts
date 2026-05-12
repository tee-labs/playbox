import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createJsonResponse } from '@/lib/response-helpers';
import { getConfig } from '@/config';
import { CORS_HEADERS } from '@/utils/constants';
import type { ProviderConfig } from '@/types';

export const dynamic = 'force-dynamic';

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

interface ModelInfo {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export async function GET(request: NextRequest) {
  if (!(await authenticate(request))) {
    return createJsonResponse(
      {
        error: {
          message: 'Incorrect API key provided.',
          type: 'invalid_request_error',
        },
      },
      401
    );
  }

  try {
    const config = await getConfig();
    const providers = config.providers;

    const anthropicVersion = request.headers.get('anthropic-version');
    const url = new URL(request.url);
    const familyParam = url.searchParams.get('family');
    const targetFamily = familyParam ?? (anthropicVersion ? 'anthropic' : 'openai');

    const modelsList: ModelInfo[] = [];
    const seenIds = new Set<string>();

    const allowedFamilies = ['openai', 'anthropic', 'embedding', 'rerank'];

    for (const [providerName, providerData] of Object.entries(providers)) {
      const provider = providerData as unknown as ProviderConfig;

      if (!allowedFamilies.includes(provider.family)) {
        continue;
      }

      if (familyParam && provider.family !== targetFamily) {
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

      // Expose "auto" model for each provider
      const autoModelId = `${providerName}/auto`;
      if (!seenIds.has(autoModelId)) {
        seenIds.add(autoModelId);
        modelsList.push({
          id: autoModelId,
          object: 'model',
          created: 1739116800,
          owned_by: providerName,
        });
      }
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
