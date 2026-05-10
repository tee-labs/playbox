import { NextRequest } from 'next/server';
import { authenticate } from '@/lib/auth';
import { createJsonResponse } from '@/lib/response-helpers';
import { getConfig, type ProviderConfig } from '@/config';

export const dynamic = 'force-dynamic';

interface GeminiModel {
  name: string;
  baseModelId: string;
  version: string;
  displayName: string;
  description: string;
  inputTokenLimit: number;
  outputTokenLimit: number;
  supportedGenerationMethods: string[];
}

interface GeminiModelsResponse {
  models: GeminiModel[];
  nextPageToken?: string;
}

export async function GET(request: NextRequest) {
  // Authenticate using platform abstraction (supports Cloudflare Workers and Vercel)
  if (!(await authenticate(request))) {
    return createJsonResponse(
      {
        error: {
          message: 'Unauthorized',
          type: 'unauthorized',
        },
      },
      401
    );
  }

  try {
    const config = await getConfig();
    const providers = config.providers;

    const modelsList: GeminiModel[] = [];
    const seenIds = new Set<string>();

    for (const [, providerData] of Object.entries(providers)) {
      const typedProvider = providerData as unknown as ProviderConfig;
      if (typedProvider.family !== 'gemini') {
        continue;
      }

      if (Array.isArray(typedProvider.models)) {
        typedProvider.models.forEach((modelId: string) => {
          if (!seenIds.has(modelId)) {
            seenIds.add(modelId);
            modelsList.push({
              name: `models/${modelId}`,
              baseModelId: modelId.split('-').slice(0, -1).join('-') || modelId,
              version: '1.0',
              displayName: modelId,
              description: `Gemini model: ${modelId}`,
              inputTokenLimit: 1048576,
              outputTokenLimit: 8192,
              supportedGenerationMethods: ['generateContent'],
            });
          }
        });
      }
    }

    const response: GeminiModelsResponse = {
      models: modelsList,
    };

    return createJsonResponse(response);
  } catch (error) {
    console.error('Error in GET /v1beta/models:', error);
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